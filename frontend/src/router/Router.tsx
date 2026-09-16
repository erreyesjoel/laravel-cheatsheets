import { Routes, Route } from "react-router-dom";
import Auth from "../pages/Auth/Auth";
import Dashboard from "../pages/Dashboard/Dashboard";
import PrivateRoute from "./PrivateRoute";
import Header from "../components/Header/Header";
import Tasks from "../pages/Tasks/Tasks";

const AppRouter = () => {
    return (
        <Routes>
            {/* Login SIN header */}
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <Auth />
                    </PrivateRoute>
                }
            />

            {/* Dashboard CON header */}
            <Route
                path="/dashboard"
                element={
                    <>
                        <Header />
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    </>
                }
            />

            <Route
                path="/tasks"
                element={
                    <>
                        <Header />
                        <PrivateRoute>
                            <Tasks />
                        </PrivateRoute>
                    </>
                }
            />
        </Routes>
    );
};

export default AppRouter;
