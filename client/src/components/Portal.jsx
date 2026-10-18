import { createPortal } from "react-dom";

// Okná (modal, zväčšená fotka) sa vykreslia priamo do <body>.
// Karta aplikácie má backdrop-filter a ten by inak "uväznil" position: fixed vo vnútri karty.
export const Portal = ({ children }) => createPortal(children, document.body);
