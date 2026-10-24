import { createPortal } from "react-dom";

export const Portal = ({ children }) => createPortal(children, document.body);
