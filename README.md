# 🎨 MS Paint Clone WebApp (alpha) 

A modern, web-based recreation of classic MS Paint, built entirely with vanilla HTML, CSS, and JavaScript. 

This project uses the HTML5 `<canvas>` element to deliver a functional drawing application. It features a Windows 11-style ribbon interface, a custom HSV color picker, dark/light mode support, and advanced image manipulation features like transparent selections and history tracking.

## 📸 Screenshots

<img width="1284" height="872" alt="image" src="https://github.com/user-attachments/assets/2a273d27-e564-4f87-b57b-842491ed0eb6" /><br>
*The main workspace featuring the ribbon UI, active canvas, and status bar.*<hr>

<img width="1034" height="375" alt="image" src="https://github.com/user-attachments/assets/a6afcb99-2e1b-4c9f-85bb-f2b3aa71d3c3" /><br>
*The custom-built HSV color picker modal in action.*<hr>

<img width="1284" height="872" alt="image" src="https://github.com/user-attachments/assets/61cf5ed2-7e90-4eed-9ebf-97019aed134e" /><br>
*The UI seamlessly transitions into a sleek Dark Mode.*

## ✨ Features

### 🖌️ Drawing Tools & Brushes
* **Standard Tools:** Pencil, Eraser, Text Tool (with adjustable font sizes), and a Color Picker (Eyedropper).
* **Advanced Flood Fill:** A custom flood-fill algorithm that accurately detects boundaries to fill enclosed spaces.
* **Custom Brushes:** * Standard
  * Marker (semi-transparent, flat edges)
  * Calligraphy (angled strokes)
  * Airbrush (particle-based scattering)
* **Shapes Library:** Draw 10 different scalable shapes including Lines, Rectangles, Circles, Triangles, Stars, Arrows, Hexagons, Chat Bubbles, Hearts, and Moons.
* **Variable Stroke Size:** Adjust tool and shape line widths dynamically from 1px to 50px.

### 🖼️ Image Manipulation
* **Smart Selection:** Draw selection boxes to move, copy, or delete parts of the image.
* **Transparent Selection:** Toggle transparent selection to ignore the background color when pasting or moving elements (just like the classic Paint feature!).
* **Canvas Controls:** Crop to selection, rotate 90 degrees, flip horizontally, and dynamically resize the canvas using drag handles or exact dimensions.
* **Undo/Redo System:** A robust history stack allows you to easily reverse or re-apply changes.
* **Grid Overlay:** Toggle a pixel-grid overlay for precise, pixel-art style drawing.

### 🎨 Color Management
* **Primary & Secondary Colors:** Left-click to draw with the primary color, right-click for the secondary color.
* **Custom Color Picker:** A fully custom-built modal allowing you to pick exact colors using Hue, Saturation, and Value sliders, complete with Hex code generation.

### 💾 File I/O
* **Open Local Files:** Import images directly from your computer onto the canvas.
* **Save / Export:** Download your masterpiece directly as an `art.png` file.

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **New File** | `Ctrl + N` |
| **Open File** | `Ctrl + O` |
| **Save File** | `Ctrl + S` |
| **Undo** | `Ctrl + Z` |
| **Redo** | `Ctrl + Y` |
| **Cut / Delete** | `Del` |
| **Reset Zoom** | `Ctrl + 0` |
| **Toggle Grid** | `Ctrl + G` |

## 🚀 Getting Started

Since this is built with vanilla web technologies, there are no build steps, bundlers, or dependencies!

1.  **Download the repository:**
2.  **Open it:**
    Simply open `index.html` in your favorite modern web browser.
3.  **Start Drawing:**
    Pick a tool from the ribbon and start creating!

## 📁 File Structure

* `index.html` - The application structure, including the ribbon, menus, and canvas layers.
* `style.css` - All styling, CSS variables for dark/light mode, and custom UI components.
* `script.js` - The core engine handling canvas context, tool logic, history stacking, and math for custom shapes/brushes.

* ## 📜 License

This project is licensed under the [GNU General Public License v2.0](LICENSE). 
*Note: This is a clone and is not affiliated with Microsoft.*
