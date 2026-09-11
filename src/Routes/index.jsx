import React, { useContext } from 'react';
import { Routes, Route } from "react-router-dom";

//Layouts
import NonAuthLayout from "../Layouts/NonAuthLayout";
import VerticalLayout from "../Layouts/index";

//routes
import { authProtectedRoutes, publicRoutes } from "./allRoutes";
import { AuthProtected } from './AuthProtected';
import { PermissionProtected } from './PermissionProtected';
import { AuthContext } from '../context/AuthContext';


const Index = () => {

    const { adminData } = useContext(AuthContext);

    return (
        <Routes>
            <Route>
                {!adminData && publicRoutes.map((route) => (
                    <Route
                        path={route.path}
                        element={
                            <NonAuthLayout>
                                {route.component}
                            </NonAuthLayout>
                        }
                        key={route.path}
                        exact={true}
                    />
                ))}
            </Route>

            {adminData && (
                <Route
                    element={
                        <AuthProtected>
                            <VerticalLayout />
                        </AuthProtected>
                    }
                >
                    {authProtectedRoutes.map((route) => (
                        <Route
                            path={route.path}
                            element={
                                <PermissionProtected>
                                    {route.component}
                                </PermissionProtected>
                            }
                            key={route.path}
                            exact={true}
                        />
                    ))}
                </Route>
            )}
        </Routes>
    );
};

export default Index;