import { useState, type FormEvent } from 'react';
import { useAuth } from '../../store/authContext';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>登录</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>邮箱</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          required style={{ width: '100%', padding: 8, margin: '4px 0' }} />
      </div>
      <div>
        <label>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required style={{ width: '100%', padding: 8, margin: '4px 0' }} />
      </div>
      <button type="submit" disabled={submitting}
        style={{ width: '100%', padding: 10, marginTop: 12 }}>
        {submitting ? '登录中...' : '登录'}
      </button>
      <p style={{ textAlign: 'center' }}>
        没有账号？<Link to="/register">注册</Link>
      </p>
    </form>
  );
}
