import { Grid3X3, Info, RadioTower } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/experiments', label: 'Experiments', icon: Grid3X3 },
  { to: '/about', label: 'About', icon: Info },
];

export function Header() {
  return (
    <header className="site-header">
      <NavLink className="brand" to="/" aria-label="tac0de home">
        <RadioTower aria-hidden="true" size={19} />
        <span>tac0de</span>
      </NavLink>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
