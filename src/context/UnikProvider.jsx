import { createContext, useState,useEffect } from "react";


const UnikContext = createContext({});

export const UnikProvider = ({ children }) => {

   
    return (
        <UnikContext.Provider value={{}}>
            {children}
        </UnikContext.Provider>
    )
}

export default UnikContext;