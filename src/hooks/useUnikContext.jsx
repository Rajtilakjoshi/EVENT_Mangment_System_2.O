import { useContext } from "react";
import UnikContext from "../context/UnikProvider";

const useUnikContext = () => {
    return useContext(UnikContext);
}

export default useUnikContext;