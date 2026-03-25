import { Navigate, Route, Routes } from 'react-router-dom';
import AsteroidGame from './game/components/AsteroidGame';
import LoginPage from './pages/login';

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/game" element={<AsteroidGame />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
