import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <aside style={{
        width: 220, background: '#1a1a2e', color: '#eee',
        padding: '20px 0', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #333', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>文件保险箱</h2>
        </div>
        <nav style={{ flex: 1 }}>
          <SidebarLink to="/">我的文件</SidebarLink>
          <SidebarLink to="/shared-with-me">分享给我的</SidebarLink>
          <SidebarLink to="/shared-by-me">我分享的</SidebarLink>
        </nav>
        <div style={{ padding: '0 20px', borderTop: '1px solid #333', paddingTop: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{user?.email}</div>
          <button onClick={handleLogout}
            style={{ background: '#e74c3c', color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: 4, cursor: 'pointer', width: '100%' }}>
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main style={{ flex: 1, padding: 24, background: '#f9f9f9' }}>
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{
      display: 'block', padding: '10px 20px', color: '#ccc',
      textDecoration: 'none', fontSize: 14,
    }}>
      {children}
    </Link>
  );
}
