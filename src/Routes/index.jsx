import React, { useContext, Suspense } from 'react';
import { Routes, Route } from "react-router-dom";

//Layouts
import NonAuthLayout from "../Layouts/NonAuthLayout";
import VerticalLayout from "../Layouts/index";

//routes
import { authProtectedRoutes, publicRoutes } from "./allRoutes";
import { AuthProtected } from './AuthProtected';
import { PermissionProtected } from './PermissionProtected';
import { AuthContext } from '../context/AuthContext';



/**
 * Shown while a route chunk downloads. Pages are lazily loaded, so every
 * navigation can suspend briefly - a visible circular spinner reads as
 * progress, where a bare text label reads as a stuck screen.
 */
const RouteFallback = () => (
    <div
        className="d-flex justify-content-center align-items-center w-100"
        style={{ minHeight: "60vh" }}
    >
        <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    </div>
);

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
                                <Suspense fallback={<RouteFallback />}>
                                    {route.component}
                                </Suspense>
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
                                    <Suspense fallback={<RouteFallback />}>
                                        {route.component}
                                    </Suspense>
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