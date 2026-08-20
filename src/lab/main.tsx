import { createRoot } from "react-dom/client";
import { SkyLab } from "./sky-lab";
import "../index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// No StrictMode: its double-mount would open and discard a WebGL context per view.
createRoot(root).render(<SkyLab />);
