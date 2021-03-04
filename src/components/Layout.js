import * as React from "react";
import pkg from '../../package.json';

function Header(props) {
  return (<header style={{
    textAlign: 'center',
    background: 'deepskyblue',
    color: 'white',
  }}>
    {props.标题}
  </header>);
}
function Footer() {
  return (<footer style={{
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

    <main style={{ flex: 1 }}>{children}</main>
    <Footer></Footer>
  </div>);

}
