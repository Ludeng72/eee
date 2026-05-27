import { useState, type FormEvent } from 'react';
import { useAuth } from '../../store/authContext';
import { useNavigate, Link } from 'react-router-dom';
import { generateRSAKeyPair, deriveMasterKey, wrapPrivateKey, generateRandomBytes, arrayBufferToBase64 } from '../../services/cryptoService';

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setSubmitting(true);
    try {
      // 1. 生成 RSA 密钥对
      const keyPair = await generateRSAKeyPair();
      const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

      // 2. 派生主密钥
      const salt = generateRandomBytes(16);
      const masterKey = await deriveMasterKey(password, salt);

      // 3. 用主密钥加密私钥
      const wrapped = await wrapPrivateKey(keyPair.privateKey, masterKey);

      await register(
        email, password, publicJwk,
        wrapped.encryptedPrivateKey, wrapped.iv,
        arrayBufferToBase64(salt.buffer), wrapped.tag
      );
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>注册</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>邮箱</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          required style={{ width: '100%', padding: 8, margin: '4px 0' }} />
      </div>
      <div>
        <label>密码（至少 8 个字符）</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required style={{ width: '100%', padding: 8, margin: '4px 0' }} />
      </div>
      <div>
        <label>确认密码</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          required style={{ width: '100%', padding: 8, margin: '4px 0' }} />
      </div>
      <button type="submit" disabled={submitting}
        style={{ width: '100%', padding: 10, marginTop: 12 }}>
        {submitting ? '生成密钥中...' : '注册'}
      </button>
      <p style={{ textAlign: 'center' }}>
        已有账号？<Link to="/login">登录</Link>
      </p>
    </form>
  );
}
