import * as React from "react";
import { useState, useRef } from 'react';
import nedb from 'nedb-promises';
import ContentEditable from 'react-contenteditable';
import { Readability } from '@mozilla/readability'
// import { JSDOM } from 'jsdom'
// var 时刻串取 = (e) => new Date(e).toLocaleTimeString()

const 初始笔记 = `
欢迎来到雪星手账，这段文字写于 2021-03-03，雪星
`.trim().split(/\r?\n/);
const 笔记库 = nedb.create('笔记.nedb'); // 本地 cache
// const 配置库 = nedb.create('配置.nedb'); // 本地 cache
// const 笔记列 = []; // 内存 cache

export const 笔记样式 = {
  margin: '2em'
}

async function 笔记库初始化() {
  false && await 笔记库.remove({});
  if (!await 笔记库.findOne({})) {
    await Promise.all(初始笔记.map((内容, 序号) => 笔记库.insert({ 序号, 内容, 创建于: new Date() })));
  }
}
export function NoteLoaded(笔记) {
  // const [同步状态, 同步状态设置] = useState({ 进度符号: '✅' });
  const [state, setState] = useState({ 笔记, 模式: '查看', 简洁: 0, 删除: 0 });
  const { _id, 内容 } = 笔记;
  const 调试信息 = JSON.stringify([笔记, state])
  const html = useRef(内容);
  const 笔记库更新 = async (_id, 更新部分) => {
    // 同步状态设置({ 进度符号: '⏳' })
    await 笔记库.update({ _id }, 更新部分).then(async () => console.log('数据库更新完成', { _id, ...更新部分 }));
    // 同步状态设置({ 进度符号: '' })
  }
  const 编辑处理 = async (evt) => await 笔记库更新(_id, { 内容: html.current = evt.target.value })
  const 模式切换 = 模式 => setState({ ...state, 模式 })
  const 笔记复习 = async (evt, 选项) => {
    await 笔记库更新(_id, { $push: { 操作: [new Date(), 选项] } })
    // 刷新列表？或切换？
    // evt.currentTarget.blur();
    模式切换("查看");
    // setState({ ...state });
  }
  const 删除笔记 = async () => await 笔记库.remove({ _id }).then(() => setState({ 删除: 1 }))
  const 按键处理 = evt => {
    if (evt.key === 'Escape') {
      evt.currentTarget.blur();
      evt.preventDefault();
      模式切换("查看");
      return
    }
    if (evt.altKey && evt.key === 'Enter') {
      evt.currentTarget.blur();
      evt.preventDefault();
      模式切换("复习");
      return
    }
    if (evt.altKey && evt.key === 'Delete') {
      evt.preventDefault(); 
      删除笔记();
      return
    }
    if (evt.altKey && evt.key === 'v') {
      // const dom = new JSDOM(html.current).window.document.body
      // const reader = new Readability(dom).parse()
      // console.log('current', evt.currentTarget, reader)
      evt.preventDefault(); 
      // html.current = new Readability(evt.currentTarget);
      return
    }
    console.log(evt.key)
  };
  return (!state.删除 &&
    <div className='snote' style={笔记样式} title={调试信息}>
      <ContentEditable
        html={html.current}
        spellcheck='false'
        // ref={ce => ce && ce.focus()}
        onKeyDown={按键处理}
        onFocus={() => { 模式切换('编辑') }}
        // onBlur={() => { 模式切换('查看') }}
        onChange={编辑处理}
        contentEditable={state.模式 !== '编辑'}
        style={{ maxHeight: '80vh', overflow: 'auto' }}
        // disabled={state.模式 !== '编辑'}
        readOnly={state.模式 !== '编辑'}
      />
      {/* {state.模式 === '复习' && <ContentEditable html={html.current} onChange={编辑处理} disabled={true} />} */}
      {/* {state.模式 === '编辑' && <span style={{ background: 'lightyellow' }}>{同步状态.进度符号}</span>} */}
      {/* {state.模式 !== '查看' && <button onClick={() => 模式切换('查看')}>查看</button>} */}
      {/* {state.模式 !== '编辑' && <button onClick={() => 模式切换('编辑')}>编辑</button >} */}
      {/* {state.模式 !== '复习' && <button onClick={() => 模式切换('复习')}>复习</button >} */}
      {
        state.模式 === '复习' && <>
          <button onClick={evt => 笔记复习(evt, '易')}>易</button>
          <button onClick={evt => 笔记复习(evt, '中')}>中</button>
          <button onClick={evt => 笔记复习(evt, '难')}>难</button>
        </>
      }
      {/* <button title="双击删除" onDoubleClick={删除笔记}>删除</button> */}
    </div >)
}
function Note({ _id }) {
  const [state, setState] = useState({});
  // 模式：编辑|查看|复习
  const 笔记加载 = () => 笔记库.findOne({ _id })
    .then(笔记 => { try { setState({ 笔记, 状态: '少女祈祷完成！' }); } catch (e) { console.error(e) } })
    .catch(e => { try { setState({ 状态: '少女祈祷错误' + e.toString() }); } catch (e) { console.error(e) } })
  if (state.状态 !== '⏳ 少女祈祷中...' && !state.笔记) {
    state.状态 = '⏳ 少女祈祷中...'
    笔记加载()
  }
  console.log(_id, state)
  return state.状态 === '少女祈祷完成！'
    ? <NoteLoaded {...state.笔记} />
    : <div style={笔记样式}>{state.状态}</div>
}

export function View() {
  const [state, setState] = useState({ 状态: '少女发呆中...' });
  const 列表加载 = async () => {
    state.状态 = '⏳ 少女祈祷中...'
    const 条件 = state.内容正则 ? { 内容: state.内容正则 } : {}
    await 笔记库
      .find(条件, { _id: 1 }) // 这一步只取摘要，每个笔记单独加载自己
      .sort({ 序号: -1 })
      .then(笔记列 => { try { setState({ 笔记列, 状态: '少女祈祷完成！' }); } catch (e) { console.error(e) } })
      .catch(e => { try { setState({ 状态: '少女祈祷错误' + e.toString() }); } catch (e) { console.error(e) } })
  }
  const 配置 = async () => {

  }
  const 导入 = async () => {

  }
  const 添加 = async () => await 笔记库.insert({
    内容: '', 序号: await 笔记库.count() + 1, 创建于: new Date()
  }).then(列表加载)
  const 正则生成 = 搜索文本 => { try { return new RegExp(搜索文本) } catch (e) { return 搜索文本 } }
  const 搜索 = async evt => {
    const 搜索文本 = evt.target.value.trim()
    state.内容正则 = 搜索文本 && 正则生成(搜索文本)
    列表加载()
  }
  if (!state.笔记列 && state.状态 !== '⏳ 少女祈祷中...') {
    列表加载()
  }
  console.log('NoteView', state);

  return (<div>
    <div style={{
      float: 'right',
      margin: '0.2em',
    }}>
      搜索：
      <input onChange={搜索} title='Alt + F' c />
      复习: <input type="checkbox" />
      <button onClick={添加} title='Alt + A'>添加</button>
      <button onClick={导入} title='Alt + I'>导入</button>
      <button onClick={配置} title='Alt + S'>配置</button>
    </div>
    <div style={{ background: 'deepskyblue', padding: '0.2em' }}> # 笔记查看 </div>
    {state.笔记列
      ? state.笔记列.map(({ _id }) => <Note key={_id} _id={_id}></Note>)
      : state.状态
    }
  </div>)
}


export function Learn() {
  const [state, setState] = useState({ 状态: '少女发呆中...' });
  const 列表加载 = async () => {
    state.状态 = '⏳ 少女祈祷中...'
    const 条件 = state.内容正则 ? { 内容: state.内容正则 } : {}
    await 笔记库
      .find(条件, { _id: 1 }) // 这一步只取摘要，每个笔记单独加载自己
      .sort({ 序号: -1 })
      .then(笔记列 => { try { setState({ 笔记列, 状态: '少女祈祷完成！' }); } catch (e) { console.error(e) } })
      .catch(e => { try { setState({ 状态: '少女祈祷错误' + e.toString() }); } catch (e) { console.error(e) } })
  }
  const 配置 = async () => {

  }
  const 导入 = async () => {

  }
  const 添加 = async () => await 笔记库.insert({
    内容: '', 序号: await 笔记库.count() + 1, 创建于: new Date()
  }).then(列表加载)
  const 正则生成 = 搜索文本 => { try { return new RegExp(搜索文本) } catch (e) { return 搜索文本 } }
  const 搜索 = async evt => {
    const 搜索文本 = evt.target.value.trim()
    state.内容正则 = 搜索文本 && 正则生成(搜索文本)
    列表加载()
  }
  if (!state.笔记列 && state.状态 !== '⏳ 少女祈祷中...') {
    列表加载()
  }

  return (<div>
    <div style={{
      float: 'right',
      margin: '0.2em',
    }}>
      搜索：
      <input onChange={搜索} title='Alt + F' c />
      复习: <input type="checkbox" />
      <button onClick={添加} title='Alt + A'>添加</button>
      <button onClick={导入} title='Alt + I'>导入</button>
      <button onClick={配置} title='Alt + S'>配置</button>
    </div>
    <div style={{ background: 'deepskyblue', padding: '0.2em' }}> # 笔记查看 </div>
    {state.笔记列
      ? state.笔记列.map(({ _id }) => <Note key={_id} _id={_id}></Note>)
      : state.状态
    }
  </div>)
}

(async () => {
  (global || window).笔记库 = 笔记库; // DEBUG
  await 笔记库初始化();
  // await 笔记库全量读取();
  // console.log(笔记列);
})();