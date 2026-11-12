import React, { createContext, useContext } from "react";
import useAppController from "./useAppController";
const Context = createContext(null);
export const useApp = () => useContext(Context);
export function AppProvider({ children }) {
  return (
    <Context.Provider value={useAppController()}>{children}</Context.Provider>
  );
}
