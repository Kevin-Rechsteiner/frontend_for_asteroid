import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const RegisterPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, role: 'USER' }),
            });

            if (!response.ok) {
                setError('Registrierung fehlgeschlagen. Bitte Eingaben prüfen.');
                return;
            }

            let responseUser: { email?: string; id?: string; roles?: string[] } | null = null;
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                responseUser = (await response.json()) as { email?: string; id?: string; roles?: string[] };
            }

            const userPayload = {
                id: responseUser?.id ?? '',
                email: responseUser?.email ?? email,
                roles: responseUser?.roles ?? ['USER'],
            };

            localStorage.setItem('user', JSON.stringify(userPayload));
            localStorage.setItem('authEmail', userPayload.email);

            navigate('/game');
        } catch {
            setError('Server nicht erreichbar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                background: '#0b1020',
                color: '#f6f7fb',
                padding: '24px',
            }}
        >
            <form
                onSubmit={onSubmit}
                style={{
                    width: '100%',
                    maxWidth: '380px',
                    background: '#111831',
                    border: '1px solid #2a3558',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'grid',
                    gap: '12px',
                }}
            >
                <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Profil erstellen</h1>

                <label style={{ display: 'grid', gap: '6px' }}>
                    <span>E-Mail</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #3b4a74' }}
                    />
                </label>

                <label style={{ display: 'grid', gap: '6px' }}>
                    <span>Passwort</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #3b4a74' }}
                    />
                </label>

                {error ? <p style={{ margin: 0, color: '#ff7c7c' }}>{error}</p> : null}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: 0,
                        background: '#4f8cff',
                        color: '#fff',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                    }}
                >
                    {isSubmitting ? 'Registrieren...' : 'Registrieren'}
                </button>

                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                    Bereits registriert?{' '}
                    <Link to="/login" style={{ color: '#8fb7ff' }}>
                        Zum Login
                    </Link>
                </p>

            </form>
        </main>
    );
};

export default RegisterPage;

