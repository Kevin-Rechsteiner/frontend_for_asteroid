import { Navigate, Route, Routes } from 'react-router-dom';
import AsteroidGame from './game/components/AsteroidGame';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/game" element={<AsteroidGame />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
