import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    const isAuthenticated = Boolean(localStorage.getItem('token')); // Check if the user is authenticated})
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;