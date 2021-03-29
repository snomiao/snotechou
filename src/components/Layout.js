import * as React from "react";
import pkg from '../../package.json';

function Header(props) {
  return (<header style={{
    float: 'right',
    textAlign: 'center',
    background: 'yellow',
    color: 'white',
  }}>
    {props.标题}
  </header>);
}
function Footer() {
  return (<footer style={{
    padding: '2em',
    background: '#111111',
    color: 'white',
    // textAlign: 'center',
    // display:'flex',
    // flexDirection: 'column',
  }}>
    <div>雪星手账 v{pkg.version}</div>
    <div>Copyright © 雪星实验室 2015-2021</div>
  </footer>);
}
export function PageLayout({ 标题, children }) {
  return (<div style={{
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  }}>
    <Header></Header>
    <main style={{
      flex: 1, maxWidth: '100%',
    }}>{children}</main>
    <Footer></Footer>
  </div>);

}
