// --- MENUS ---
function toggleMenu(id, btn) {
    document.querySelectorAll('.menu-dropdown').forEach(m => {
        if(m.id !== id) m.classList.remove('show');
    });
    const menu = document.getElementById(id);
    if(menu) {
        if(btn && !menu.classList.contains('show')) {
            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 5) + 'px';
            menu.style.left = rect.left + 'px';
        }
        menu.classList.toggle('show');
    }
}
window.addEventListener('click', (e) => {
    if (!e.target.closest('.win-btn') && !e.target.closest('.brush-dropdown') && !e.target.closest('#t-select')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show'));
    }
});

// --- COLOR PICKER ---
class ColorPicker {
    constructor() {
        this.modal = document.getElementById('color-modal');
        this.sv = document.getElementById('cp-sv');
        this.h = document.getElementById('cp-h');
        this.preview = document.getElementById('cp-prev');
        this.ctxSV = this.sv.getContext('2d');
        this.ctxH = this.h.getContext('2d');
        this.hue = 0; this.sat = 1; this.val = 1;
        this.bindEvents();
    }
    bindEvents() {
        this.h.onmousedown = (e) => { this.draggingH = true; this.updateHue(e); }
        window.addEventListener('mousemove', (e) => {
            if(this.draggingH) this.updateHue(e);
            if(this.draggingSV) this.updateSV(e);
        });
        window.addEventListener('mouseup', () => { this.draggingH = false; this.draggingSV = false; });
        this.sv.onmousedown = (e) => { this.draggingSV = true; this.updateSV(e); }
    }
    open() { this.modal.style.display = 'flex'; this.drawHue(); this.drawSV(); this.updatePreview(); }
    close() { this.modal.style.display = 'none'; }
    pick() { engine.setCustomColor(this.hsvToHex(this.hue, this.sat, this.val)); this.close(); }
    drawHue() {
        const g = this.ctxH.createLinearGradient(0,0,0,200);
        g.addColorStop(0,'#f00'); g.addColorStop(0.17,'#ff0'); g.addColorStop(0.33,'#0f0');
        g.addColorStop(0.5,'#0ff'); g.addColorStop(0.67,'#00f'); g.addColorStop(0.83,'#f0f'); g.addColorStop(1,'#f00');
        this.ctxH.fillStyle = g; this.ctxH.fillRect(0,0,30,200);
    }
    drawSV() {
        this.ctxSV.clearRect(0,0,280,200);
        this.ctxSV.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
        this.ctxSV.fillRect(0,0,280,200);
        const w = this.ctxSV.createLinearGradient(0,0,280,0);
        w.addColorStop(0, '#fff'); w.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctxSV.fillStyle = w; this.ctxSV.fillRect(0,0,280,200);
        const b = this.ctxSV.createLinearGradient(0,0,0,200);
        b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(1, '#000');
        this.ctxSV.fillStyle = b; this.ctxSV.fillRect(0,0,280,200);
        const x = this.sat * 280; const y = (1-this.val) * 200;
        this.ctxSV.strokeStyle = this.val > 0.5 ? '#000' : '#fff';
        this.ctxSV.beginPath(); this.ctxSV.arc(x,y,5,0,Math.PI*2); this.ctxSV.stroke();
    }
    updateHue(e) {
        const r = this.h.getBoundingClientRect();
        this.hue = Math.floor((Math.max(0,Math.min(e.clientY-r.top,200))/200)*360);
        this.drawSV(); this.updatePreview();
    }
    updateSV(e) {
        const r = this.sv.getBoundingClientRect();
        this.sat = Math.max(0,Math.min(e.clientX-r.left,280))/280;
        this.val = 1 - Math.max(0,Math.min(e.clientY-r.top,200))/200;
        this.drawSV(); this.updatePreview();
    }
    updatePreview() { this.preview.style.backgroundColor = this.hsvToHex(this.hue, this.sat, this.val); }
    hsvToHex(h,s,v) {
        let f=(n,k=(n+h/60)%6) => v - v*s*Math.max(Math.min(k,4-k,1),0);
        return "#" + ((1<<24)+(Math.round(f(5)*255)<<16)+(Math.round(f(3)*255)<<8)+Math.round(f(1)*255)).toString(16).slice(1);
    }
}
const colorPicker = new ColorPicker();

// --- ENGINE ---
class PaintEngine {
    constructor() {
        this.main = document.getElementById('main-canvas');
        this.helper = document.getElementById('helper-canvas');
        this.stack = document.getElementById('canvas-stack');
        this.selBox = document.getElementById('selection-box');
        this.textBox = document.getElementById('text-tool');
        this.ctx = this.main.getContext('2d', { willReadFrequently: true });
        this.hCtx = this.helper.getContext('2d');
        
        this.resizeStack(800, 600);
        this.tool = 'pencil';
        this.brushType = 'normal';
        this.shape = 'line';
        this.colors = { 1: '#000000', 2: '#ffffff' };
        this.activeSlot = 1;
        this.lineWidth = 3;
        this.zoom = 1;
        this.isDrawing = false;
        
        this.history = [];
        this.historyStep = -1;
        this.selection = { active: false, moving: false, x: 0, y: 0, w: 0, h: 0, content: null };
        
        // New Feature: Transparent Selection
        this.transparentSelection = false;

        this.isResizing = false;
        this.resizeDir = null;
        this.init();
    }

    init() {
        this.ctx.imageSmoothingEnabled = true;
        this.hCtx.imageSmoothingEnabled = true;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0,0, this.main.width, this.main.height);
        this.saveState();
        this.renderPalette();
        this.bindEvents();
        this.updateColorUI();
    }

    resizeStack(w, h) {
        this.stack.style.width = w + 'px';
        this.stack.style.height = h + 'px';
        document.getElementById('status-dims').innerText = `${w} x ${h}px`;
    }

    bindEvents() {
        this.helper.addEventListener('pointerdown', this.onDown.bind(this));
        window.addEventListener('pointermove', this.onMove.bind(this));
        window.addEventListener('pointerup', this.onUp.bind(this));
        this.selBox.addEventListener('pointerdown', this.onSelDown.bind(this));
        this.textBox.addEventListener('blur', (e) => this.onTextBlur(e));
        
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.isResizing = true;
                this.resizeDir = e.target.dataset.dir;
                this.resizeStart = { x: e.clientX, y: e.clientY };
                this.startDims = { w: parseInt(this.stack.style.width), h: parseInt(this.stack.style.height) };
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
            if (e.key === 'Delete') { this.deleteSelection(); }
        });
    }

    getPos(e) {
        const rect = this.main.getBoundingClientRect();
        return { x: (e.clientX - rect.left) / this.zoom, y: (e.clientY - rect.top) / this.zoom };
    }

    onDown(e) {
        if (this.isResizing) return;
        if (this.tool === 'text') { this.startText(e); return; }
        if (this.selection.active) { this.pasteSelection(); }

        this.isDrawing = true;
        const p = this.getPos(e);
        this.startX = p.x; this.startY = p.y;
        this.lastX = p.x; this.lastY = p.y;
        
        const slot = (e.button === 2) ? 2 : 1;
        this.drawColor = this.colors[slot];
        this.fillColor = this.colors[slot === 1 ? 2 : 1];
        
        this.ctx.lineWidth = this.lineWidth; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.drawColor; this.ctx.fillStyle = this.drawColor; this.ctx.globalAlpha = 1.0;
        
        if(this.tool === 'brush') {
            if(this.brushType === 'marker') { this.ctx.globalAlpha = 0.5; this.ctx.lineWidth = this.lineWidth * 3; this.ctx.lineCap = 'butt'; }
            else if(this.brushType === 'airbrush') { this.ctx.lineWidth = this.lineWidth * 4; }
        }

        this.hCtx.lineWidth = this.lineWidth; this.hCtx.strokeStyle = this.drawColor; this.hCtx.fillStyle = this.fillColor;

        if (this.tool === 'fill') { this.floodFill(Math.floor(p.x), Math.floor(p.y), this.drawColor); this.isDrawing = false; }
        else if (this.tool === 'picker') {
            const d = this.ctx.getImageData(p.x, p.y, 1, 1).data;
            this.colors[this.activeSlot] = this.rgbToHex(d[0], d[1], d[2]);
            this.updateColorUI(); this.setTool('pencil'); this.isDrawing = false;
        }
        else if (this.tool === 'select') {
            this.selBox.style.display = 'block'; this.selBox.style.width = '0'; this.selBox.style.height = '0';
            this.selBox.style.backgroundImage = 'none'; this.selBox.style.backgroundColor = 'rgba(0,120,255,0.2)';
            this.selection.active = false;
        }
        else if (['pencil', 'brush', 'eraser'].includes(this.tool)) {
            this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y);
            if (this.tool === 'eraser') { this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = this.lineWidth * 4; } 
            else if (this.tool === 'pencil') { this.ctx.lineWidth = 1; this.ctx.lineCap = 'butt'; }
        }
    }

    onMove(e) {
        if (this.isResizing) {
            const dx = (e.clientX - this.resizeStart.x) / this.zoom; const dy = (e.clientY - this.resizeStart.y) / this.zoom;
            let newW = this.startDims.w; let newH = this.startDims.h;
            if (this.resizeDir.includes('e')) newW = Math.max(10, this.startDims.w + dx);
            if (this.resizeDir.includes('s')) newH = Math.max(10, this.startDims.h + dy);
            this.resizeStack(newW, newH); return;
        }
        const p = this.getPos(e);
        document.getElementById('status-coords').innerText = `${Math.round(p.x)}, ${Math.round(p.y)}px`;

        if (this.selection.moving) {
            const dx = p.x - this.dragStart.x; const dy = p.y - this.dragStart.y;
            this.selection.x = this.selOrigin.x + dx; this.selection.y = this.selOrigin.y + dy;
            this.updateSelBox(); return;
        }
        if (!this.isDrawing) return;

        if (['pencil', 'eraser'].includes(this.tool) || (this.tool==='brush' && this.brushType==='normal')) {
            this.ctx.lineTo(p.x, p.y); this.ctx.stroke();
        }
        else if (this.tool === 'brush') { this.drawBrush(p.x, p.y); }
        else if (this.tool === 'shape') {
            this.hCtx.clearRect(0,0, this.main.width, this.main.height);
            this.drawShape(this.hCtx, this.startX, this.startY, p.x, p.y);
        }
        else if (this.tool === 'select') {
            const w = p.x - this.startX; const h = p.y - this.startY;
            const rx = w < 0 ? this.startX + w : this.startX; const ry = h < 0 ? this.startY + h : this.startY;
            this.selBox.style.left = (rx * this.zoom) + 'px'; this.selBox.style.top = (ry * this.zoom) + 'px';
            this.selBox.style.width = (Math.abs(w) * this.zoom) + 'px'; this.selBox.style.height = (Math.abs(h) * this.zoom) + 'px';
        }
        this.lastX = p.x; this.lastY = p.y;
    }

    onUp(e) {
        if (this.isResizing) {
            this.isResizing = false;
            const w = parseInt(this.stack.style.width); const h = parseInt(this.stack.style.height);
            const temp = document.createElement('canvas'); temp.width = this.main.width; temp.height = this.main.height;
            temp.getContext('2d').drawImage(this.main, 0, 0);
            this.main.width = w; this.main.height = h; this.helper.width = w; this.helper.height = h;
            this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(0,0,w,h); this.ctx.drawImage(temp, 0, 0);
            this.saveState(); return;
        }
        if(this.selection.moving) { this.selection.moving = false; return; }
        if(!this.isDrawing) return;
        this.isDrawing = false;
        const p = this.getPos(e);

        if (this.tool === 'shape') {
            this.drawShape(this.ctx, this.startX, this.startY, p.x, p.y);
            this.hCtx.clearRect(0,0, this.main.width, this.main.height);
            this.saveState();
        }
        else if (this.tool === 'select') {
            const w = p.x - this.startX; const h = p.y - this.startY;
            if (Math.abs(w) > 2 && Math.abs(h) > 2) {
                this.createSelection(w < 0 ? this.startX + w : this.startX, h < 0 ? this.startY + h : this.startY, Math.abs(w), Math.abs(h));
            } else { this.selBox.style.display = 'none'; }
        }
        else if (['pencil', 'brush', 'eraser'].includes(this.tool)) { this.saveState(); }
    }

    drawBrush(x, y) {
        if(this.brushType === 'marker') {
            this.ctx.beginPath(); this.ctx.moveTo(this.lastX, this.lastY); this.ctx.lineTo(x,y); this.ctx.stroke();
        } else if(this.brushType === 'calligraphy') {
            this.ctx.beginPath(); this.ctx.moveTo(this.lastX-5, this.lastY+5); this.ctx.lineTo(this.lastX+5, this.lastY-5);
            this.ctx.lineTo(x+5, y-5); this.ctx.lineTo(x-5, y+5); this.ctx.fill();
        } else if(this.brushType === 'airbrush') {
            for(let i=0; i<20; i++) {
                const ox = (Math.random()-0.5)*this.lineWidth*3; const oy = (Math.random()-0.5)*this.lineWidth*3;
                this.ctx.fillRect(x+ox, y+oy, 1, 1);
            }
        }
    }

    drawShape(ctx, x1, y1, x2, y2) {
        const w = x2 - x1; const h = y2 - y1;
        ctx.beginPath();
        if (this.shape === 'line') { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        else if (this.shape === 'rect') { ctx.rect(x1, y1, w, h); ctx.stroke(); }
        else if (this.shape === 'circle') { ctx.ellipse(x1+w/2, y1+h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI*2); ctx.stroke(); }
        else if (this.shape === 'triangle') { ctx.moveTo(x1+w/2, y1); ctx.lineTo(x1, y1+h); ctx.lineTo(x1+w, y1+h); ctx.closePath(); ctx.stroke(); }
        else if (this.shape === 'star') { this.drawPoly(ctx, x1+w/2, y1+h/2, 5, Math.abs(w/2), Math.abs(w/4)); }
        else if (this.shape === 'poly') { this.drawHex(ctx, x1+w/2, y1+h/2, Math.abs(w/2)); }
        else if (this.shape === 'arrow') {
            const hh = Math.abs(h); const hw = Math.abs(w); const st = hh * 0.5; const sl = hw * 0.6;
            const dx = w > 0 ? 1 : -1; const cy = y1 + h/2; const hs = x1 + (sl * dx);
            ctx.moveTo(x1, cy - (st/2)); ctx.lineTo(hs, cy - (st/2)); ctx.lineTo(hs, y1);
            ctx.lineTo(x2, cy); ctx.lineTo(hs, y2); ctx.lineTo(hs, cy + (st/2));
            ctx.lineTo(x1, cy + (st/2)); ctx.closePath(); ctx.stroke();
        }
        else if (this.shape === 'chat') {
            const r=10; const bh=h*0.8; const tw=w*0.2;
            ctx.moveTo(x1+r, y1); ctx.lineTo(x1+w-r, y1); ctx.quadraticCurveTo(x1+w, y1, x1+w, y1+r);
            ctx.lineTo(x1+w, y1+bh-r); ctx.quadraticCurveTo(x1+w, y1+bh, x1+w-r, y1+bh);
            ctx.lineTo(x1+tw*2, y1+bh); ctx.lineTo(x1+tw, y2); ctx.lineTo(x1+tw, y1+bh);
            ctx.lineTo(x1+r, y1+bh); ctx.quadraticCurveTo(x1, y1+bh, x1, y1+bh-r);
            ctx.lineTo(x1, y1+r); ctx.quadraticCurveTo(x1, y1, x1+r, y1); ctx.stroke();
        }
        else if (this.shape === 'heart') {
            const tch = h*0.3;
            ctx.moveTo(x1+w/2, y1+h/5); ctx.bezierCurveTo(x1+w/2, y1, x1, y1, x1, y1+tch);
            ctx.bezierCurveTo(x1, y1+(h+tch)/2, x1+w/2, y1+(h+tch)/2, x1+w/2, y2);
            ctx.bezierCurveTo(x1+w/2, y1+(h+tch)/2, x2, y1+(h+tch)/2, x2, y1+tch);
            ctx.bezierCurveTo(x2, y1, x1+w/2, y1, x1+w/2, y1+h/5); ctx.stroke();
        }
        else if (this.shape === 'moon') {
            const cx = x1+w/2; const cy = y1+h/2; const r = Math.abs(w/2);
            ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke(); ctx.beginPath();
            ctx.arc(cx, cy, r, 0.8, 5.5, false);
            const cpx = cx + (w*0.5); const sx = cx + r*Math.cos(0.8); const sy = cy + r*Math.sin(0.8);
            ctx.bezierCurveTo(cpx, cy-r, cpx, cy+r, sx, sy); ctx.stroke();
        }
    }

    drawPoly(ctx, cx, cy, spikes, outer, inner) {
        let rot = Math.PI/2*3; let step = Math.PI/spikes; let x=cx; let y=cy;
        ctx.moveTo(cx, cy-outer);
        for(let i=0;i<spikes;i++){
            x=cx+Math.cos(rot)*outer; y=cy+Math.sin(rot)*outer; ctx.lineTo(x,y); rot+=step;
            x=cx+Math.cos(rot)*inner; y=cy+Math.sin(rot)*inner; ctx.lineTo(x,y); rot+=step;
        }
        ctx.lineTo(cx, cy-outer); ctx.closePath(); ctx.stroke();
    }

    drawHex(ctx, cx, cy, r) {
        ctx.moveTo(cx+r, cy);
        for(let i=1; i<=6; i++) { ctx.lineTo(cx+r*Math.cos(i*2*Math.PI/6), cy+r*Math.sin(i*2*Math.PI/6)); }
        ctx.closePath(); ctx.stroke();
    }

    floodFill(sx, sy, col) {
        const w = this.main.width; const h = this.main.height;
        const id = this.ctx.getImageData(0,0,w,h); const d = id.data;
        const idx = (sy*w+sx)*4; const tr=d[idx], tg=d[idx+1], tb=d[idx+2];
        const rgb = this.hexToRgb(col);
        if(tr===rgb.r && tg===rgb.g && tb===rgb.b) return;
        const st = [[sx, sy]];
        while(st.length) {
            const [x,y] = st.pop(); const i = (y*w+x)*4;
            if(x<0||x>=w||y<0||y>=h) continue;
            if(d[i]===tr && d[i+1]===tg && d[i+2]===tb) {
                d[i]=rgb.r; d[i+1]=rgb.g; d[i+2]=rgb.b; d[i+3]=255;
                st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
            }
        }
        this.ctx.putImageData(id, 0, 0); this.saveState();
    }

    createSelection(x,y,w,h) {
        const d = this.ctx.getImageData(x,y,w,h);
        const t = document.createElement('canvas');
        t.width = w; t.height = h;
        t.getContext('2d').putImageData(d, 0, 0);
        this.selection = { active: true, moving: false, x,y,w,h, content: t };
        this.selBox.style.display = 'block';
        this.selBox.style.left = (x*this.zoom)+'px'; this.selBox.style.top = (y*this.zoom)+'px';
        this.selBox.style.width = (w*this.zoom)+'px'; this.selBox.style.height = (h*this.zoom)+'px';
        this.selBox.style.backgroundImage = `url(${t.toDataURL()})`; this.selBox.style.backgroundSize = '100% 100%';
        this.ctx.fillStyle = this.colors[2]; this.ctx.fillRect(x,y,w,h);
        this.saveState();
    }
    onSelDown(e) {
        e.stopPropagation(); this.selection.moving = true;
        const p = this.getPos(e); this.dragStart = p;
        this.selOrigin = { x: this.selection.x, y: this.selection.y };
    }
    updateSelBox() {
        this.selBox.style.left = (this.selection.x*this.zoom)+'px'; this.selBox.style.top = (this.selection.y*this.zoom)+'px';
    }
    toggleTransparent(btn) {
        this.transparentSelection = !this.transparentSelection;
        btn.classList.toggle('checked', this.transparentSelection);
    }
    pasteSelection() {
        if(!this.selection.active) return;
        
        // Handle Transparent Selection
        if (this.transparentSelection) {
            const tCtx = this.selection.content.getContext('2d');
            const w = this.selection.content.width;
            const h = this.selection.content.height;
            const imageData = tCtx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const bg = this.hexToRgb(this.colors[2]); // Secondary color is "transparent" key
            
            for(let i=0; i<data.length; i+=4) {
                // Fuzzy match for compression artifacts if needed, but exact match for now
                if (data[i] === bg.r && data[i+1] === bg.g && data[i+2] === bg.b) {
                    data[i+3] = 0; // Alpha 0
                }
            }
            tCtx.putImageData(imageData, 0, 0);
        }

        this.ctx.drawImage(this.selection.content, this.selection.x, this.selection.y);
        this.selection.active = false; this.selBox.style.display = 'none';
        this.saveState();
    }
    deleteSelection() {
        if(this.selection.active) {
            this.selection.active = false; this.selBox.style.display = 'none'; this.saveState();
        }
    }
    selectAll() {
        this.createSelection(0,0,this.main.width, this.main.height);
    }

    startText(e) {
        const p = this.getPos(e);
        this.textBox.style.display = 'block';
        const cr = this.main.getBoundingClientRect();
        this.textBox.style.left = (e.clientX-cr.left)+'px'; this.textBox.style.top = (e.clientY-cr.top)+'px';
        this.textBox.style.color = this.colors[1];
        this.updateTextSize(); this.textBox.innerText = '';
        setTimeout(()=>this.textBox.focus(),0); this.textPos = p;
    }
    updateTextSize() { this.textBox.style.fontSize = (this.lineWidth * 3 + 12) + 'px'; }
    onTextBlur(e) {
        if (e.relatedTarget && e.relatedTarget.id === 'tool-size-slider') { this.textBox.focus(); return; }
        const t = this.textBox.innerText;
        if(t.trim()) {
            this.ctx.font = `${this.lineWidth * 3 + 12}px 'Segoe UI'`;
            this.ctx.fillStyle = this.colors[1];
            this.ctx.textBaseline = 'top'; this.ctx.fillText(t, this.textPos.x, this.textPos.y);
            this.saveState();
        }
        this.textBox.style.display = 'none'; this.textBox.innerText = '';
    }

    saveState() {
        if(this.historyStep < this.history.length-1) this.history = this.history.slice(0, this.historyStep+1);
        this.history.push(this.main.toDataURL()); this.historyStep++;
    }
    undo() { if(this.historyStep>0) { this.historyStep--; this.load(this.history[this.historyStep]); } }
    redo() { if(this.historyStep<this.history.length-1) { this.historyStep++; this.load(this.history[this.historyStep]); } }
    load(src) {
        const i = new Image();
        i.onload = () => { this.ctx.clearRect(0,0,this.main.width, this.main.height); this.ctx.drawImage(i, 0, 0); }
        i.src = src;
    }
    setTool(t) {
        if(this.selection.active) this.pasteSelection();
        this.tool = t;
        if(t !== 'brush') this.brushType = 'normal';
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const el = document.getElementById('t-'+t) || document.getElementById('t-select');
        if(el) el.classList.add('active');
        
        // Close selection menu if select tool picked via menu
        document.getElementById('menu-select').classList.remove('show');
    }
    setBrushType(t) { this.brushType = t; this.setTool('brush'); document.getElementById('menu-brushes').classList.remove('show'); }
    setShape(s) { this.setTool('shape'); this.shape = s; }
    setSlot(n) { this.activeSlot = n; this.updateColorUI(); }
    updateColorUI() {
        document.getElementById('slot1').style.backgroundColor = this.colors[1];
        document.getElementById('slot2').style.backgroundColor = this.colors[2];
        document.getElementById('slot1').classList.toggle('active', this.activeSlot===1);
        document.getElementById('slot2').classList.toggle('active', this.activeSlot===2);
    }
    setCustomColor(c) { this.colors[this.activeSlot] = c; this.updateColorUI(); }
    setLineWidth(v) { 
        this.lineWidth = parseInt(v); 
        document.getElementById('size-display').innerText = v + 'px';
        if(this.textBox.style.display==='block') this.updateTextSize();
    }
    setZoom(v) { 
        this.zoom = v/100; this.stack.style.transform = `scale(${this.zoom})`; 
        document.getElementById('zoom-text').innerText = v + '%';
    }
    resizeCanvas() {
        const w = prompt("Width", this.main.width); const h = prompt("Height", this.main.height);
        if(w&&h) {
            const t = this.main.toDataURL();
            const nw = parseInt(w); const nh = parseInt(h);
            this.main.width = nw; this.main.height = nh; this.helper.width = nw; this.helper.height = nh;
            this.resizeStack(nw, nh); this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(0,0,nw,nh); this.load(t);
        }
    }
    hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
    rgbToHex(r, g, b) { return "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
    renderPalette() {
        const cols = ['#000000','#7f7f7f','#880015','#ed1c24','#ff7f27','#fff200','#22b14c','#00a2e8','#3f48cc','#a349a4','#ffffff','#c3c3c3','#b97a57','#ffaec9','#ffc90e','#efe4b0','#b5e61d','#99d9ea','#7092be','#c8bfe7'];
        const p = document.getElementById('palette');
        cols.forEach(c => {
            const d = document.createElement('div'); d.className = 'swatch'; d.style.backgroundColor = c;
            d.onclick = () => { this.colors[this.activeSlot] = c; this.updateColorUI(); }; p.appendChild(d);
        });
    }
    save() { const a = document.createElement('a'); a.download = 'art.png'; a.href = this.main.toDataURL(); a.click(); }
    openFile(input) {
        const f = input.files[0];
        if(f) {
            const img = new Image();
            img.onload = () => {
                this.main.width = img.width; this.main.height = img.height;
                this.helper.width = img.width; this.helper.height = img.height;
                this.resizeStack(img.width, img.height);
                this.ctx.drawImage(img, 0, 0); this.saveState();
            }
            img.src = URL.createObjectURL(f);
        }
    }
    crop() {
        if(!this.selection.active) { alert("Select area first"); return; }
        const t = document.createElement('canvas'); t.width = this.selection.w; t.height = this.selection.h;
        t.getContext('2d').drawImage(this.selection.content, 0, 0);
        this.main.width = this.selection.w; this.main.height = this.selection.h;
        this.helper.width = this.selection.w; this.helper.height = this.selection.h;
        this.resizeStack(this.selection.w, this.selection.h);
        this.ctx.drawImage(t, 0, 0);
        this.selection.active = false; this.selBox.style.display = 'none'; this.saveState();
    }
    rotate() {
        const t = document.createElement('canvas'); t.width = this.main.height; t.height = this.main.width;
        const c = t.getContext('2d'); c.translate(t.width/2, t.height/2); c.rotate(90 * Math.PI / 180);
        c.drawImage(this.main, -this.main.width/2, -this.main.height/2);
        this.main.width = t.width; this.main.height = t.height; this.helper.width = t.width; this.helper.height = t.height;
        this.resizeStack(t.width, t.height); this.ctx.drawImage(t, 0, 0); this.saveState();
    }
    flip() {
        const t = document.createElement('canvas'); t.width = this.main.width; t.height = this.main.height;
        const c = t.getContext('2d'); c.scale(-1, 1); c.drawImage(this.main, -this.main.width, 0);
        this.ctx.clearRect(0,0, this.main.width, this.main.height); this.ctx.drawImage(t, 0, 0); this.saveState();
    }
    newFile() { if(confirm("New file?")) { this.ctx.fillStyle = '#fff'; this.ctx.fillRect(0,0,this.main.width, this.main.height); this.history = []; this.saveState(); } }
    clearCanvas() { this.ctx.fillStyle = '#fff'; this.ctx.fillRect(0,0,this.main.width, this.main.height); this.saveState(); }
    toggleGrid() { const g = document.getElementById('grid-overlay'); g.style.display = g.style.display === 'block' ? 'none' : 'block'; }
}

const engine = new PaintEngine();
/* =========================================================================
   WebApp Protection
   ========================================================================= */
  if (window.top !== window.self) {
    if (document.referrer && document.referrer.includes("typespectrum.com")) {
      try {
        // Try to hijack the entire browser tab and redirect to your site
        window.top.location.href = "https://ywa.app";
      } catch (e) {
        // If the browser blocks the hijack, absolutely nuke the iframe content
        document.documentElement.innerHTML = `
          <head>
            <title>ERROR</title>
          </head>
          <body style="margin: 0; padding: 0; overflow: hidden;">
            <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #e50000; color: white; z-index: 2147483647; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: system-ui, -apple-system, sans-serif; padding: 20px; box-sizing: border-box;">
              <h1 style="font-size: clamp(24px, 5vw, 48px); margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 2px;">
                ⚠️ Error ⚠️
              </h1>
              <p style="font-size: clamp(16px, 3vw, 24px); margin: 0 0 10px 0; line-height: 1.5;">
                This WebApp can not be displayed here.
              </p>
              <p style="font-size: clamp(14px, 2.5vw, 20px); margin: 0; line-height: 1.5;">
                Possible Scam site detected</strong>.<br>
                For security, Please visit ywa.app to use it.
              </p>
            </div>
          </body>
        `;
      }
    }
  }