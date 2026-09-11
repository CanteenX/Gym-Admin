import React from "react";
import "./assets/scss/themes.scss";
import "react-toastify/dist/ReactToastify.css";
import Route from "./Routes";
import axios from "axios";

import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { ToastContainer } from "react-toastify";
import config from "./config";

function App() {
    axios.defaults.baseURL = config.api.API_URL;

    return (
        <AuthProvider>
            <MenuProvider>
                <ToastContainer />
                <Route />
            </MenuProvider>
        </AuthProvider>
    );
}

export default App;
