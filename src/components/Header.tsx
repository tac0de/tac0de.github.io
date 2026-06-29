import { NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="site-header">
      <NavLink className="brand" to="/" aria-label="tac0de home">
        <span>tac0de</span>
      </NavLink>
    </header>
  );
}
