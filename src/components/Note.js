import * as React from "react";
import { useState, useRef, useEffect } from 'react';
import nedb from 'nedb-promises';
import ContentEditable from 'react-contenteditable';
import { Readability } from '@mozilla/readability'
import './Note.css'
import LazyLoad from 'react-lazyload'
// import { JSDOM } from 'jsdom'
// var 时刻串取 = (e) => new Date(e).toLocaleTimeString()

const 初始笔记 = `
欢迎来到雪星手账，这段文字写于 2021-03-03....

`.trim().split(/\r?\n/);

const 笔记库 = nedb.create('笔记.nedb'); // 本地 cache
// const 配置库 = nedb.create('配置.nedb'); // 本地 cache

const 笔记复习规划 = (笔记, 选项) => {
    const 选项量化 = 选项 => ([-1, 0, 1]['难中易'.indexOf(选项)] || 0)
    const 此前熟级 = 笔记?.复习史?.reduce((熟级, { 选项 }) => 熟级 + 选项量化(选项), 0)
    const 熟级 = (此前熟级 || 0) + ([-1, 0, 1]['难中易'.indexOf(选项)] || 0)
    const 经验算法间隔天数 = parseInt('1,3,5,7,10,14,20,35,70,85,97'.split(',')[熟级]) || 0 //  but 这个数字复习频率过高

    const 间隔天数 = 经验算法间隔天数 || 0
    const 边界算法间隔秒 = parseInt('3600,86400,99999'.split(',')['难中易'.indexOf(选项)]) || 0
    const 参考时间 = new Date()
    const 将复习于 = 间隔天数
        ? new Date(+new Date(参考时间.toDateString()) + 间隔天数 * 86400e3)
        : new Date(+参考时间 + 边界算法间隔秒 * 1e3)
    const 描述 = 相对时间获取(将复习于, 参考时间)
    return ({ 将复习于, 描述 });
}

const 相对时间获取 = (时间, 参考时间 = new Date()) => {
    const 毫秒差 = +参考时间 - +new Date(时间)
    const 单位时间列 = Object.entries({
        毫秒: 1, 秒: 1e3, 分钟: 60e3, 小时: 3600e3,
        天: 86400e3, 周: 7 * 86400e3, 月: 30 * 86400e3,
        年: 365 * 86400e3, 世纪: 100 * 365 * 86400e3, 永恒: Infinity
    }).reverse()
    const [单位, 倍数] = 单位时间列.find(([单位, 倍数]) => (Math.abs(毫秒差) / 倍数) >= 1) || ['刹那', 0]
    return `${Math.abs(毫秒差 / 倍数).toPrecision(2)}${单位}${毫秒差 > 0 ? '前' : '后'}`
}
// const 向量法相对时间获取 = (时间) => {
//     const 时间拆分 = 时间 => new Date(时间)?.toISOString()?.match(/\d+/g)?.map(e => parseInt(e)) || []
//     const 时差向量 = [时间拆分(new Date()), 时间拆分(时间)]
//         .reduce((a, b) => a.map((v, i) => v - b[i]))
//     const 有效位序 = 时差向量.findIndex(e => e !== 0)
//     const 单位 = '年,月,日,小时,分钟,秒,毫秒'.split(',')[有效位序]
//     const 差值 = 时差向量[有效位序]
//     const 前后 = (差值 > 0 ? '前' : '后')
//     return `${Math.abs(差值)}${单位}${前后}`
// }

export const 笔记样式 = {
    margin: '2em'
}


async function 笔记库初始化() {
    false && await 笔记库.remove({});
    if (!await 笔记库.findOne({})) {
        await Promise.all(初始笔记.map((内容, 序号) => 笔记库.insert({ 序号, 内容, 创建于: new Date() })));
    }
}
export function NoteLoaded({ 笔记, 模式 = '浏览', 列表加载, 笔记加载, 笔记添加, 入门 = false }) {
    // const [同步状态, 同步状态设置] = useState({ 进度符号: '✅' });
    const [state, setState] = useState({ 笔记, 模式, 简洁: 0, 隐藏: 0 });
    const { _id, 内容, 创建于 } = 笔记;
    // const _标题 = 笔记?.内容?.trim().slice(0, 20)
    const 调试信息 = JSON.stringify([笔记, state])
    const html = useRef(内容);
    const 笔记库更新 = async (_id, 更新部分) => {
        // 同步状态设置({ 进度符号: '⏳' })
        await 笔记库.update({ _id }, 更新部分)
            .then(async () => console.log('数据库更新完成', { _id, ...更新部分 }));
        // 同步状态设置({ 进度符号: '' })
    }
    const 编辑处理 = async (evt) => await 笔记库更新(_id, { $set: { 内容: html.current = evt.target.value } })
    const 模式切换 = 模式 => setState({ ...state, 模式 })
    const 笔记复习 = async (选项) => {
        // if (选项 === '撤') {

        // }
        const { 将复习于 } = 笔记复习规划(笔记, 选项)
        await 笔记库更新(_id, { $set: { 将复习于 }, $push: { 复习史: { 选项, 于: new Date() } } })
        列表加载()
        笔记加载()
        // TODO: 刷新列表
        // 模式切换("浏览")
        // setState({ 隐藏: 1 })
    }
    const 删除笔记 = async () => await 笔记库.update({ _id }, { $set: { 删除于: new Date() } }).then(() => setState({ 隐藏: 1 }))
    const 笔记格式调整 = () => {
        // 处理链接
        // [...document.querySelectorAll('#snote-' + _id + '>div[contenteditable] a')]
        // 让链接可以点
        // .map(a => a.setAttribute('contenteditable', 'true'))
        // TODO 让可以点的链接可以编辑 通过拆成一个一个字
        // .map(a => a.innerHTML.split('').map(char => a.cloneNode().innerHTML))
    }
    const 笔记抽取 = async () => {
        if (!window.getSelection().toString()) return alert('没有要抽取的内容');
        //抽取 还有bug
        const div = document.createElement('div')
        const range = window.getSelection()?.getRangeAt(0)
        const docFragment = range?.cloneContents()
        const selectedHTML = (div.appendChild(docFragment), div.innerHTML); div.remove()
        // console.log('selectedHTML', docFragment, selectedHTML)

        const 子笔记 = await 笔记添加({ 内容: selectedHTML, 上级: _id }, { 立即显示: false })
        const 子笔记链接 = `/view#${子笔记._id}`

        var a = document.createElement('a')
        a.contentEditable = false  // 目前还不能直接编辑抽取子笔记
        a.href = 子笔记链接
        a.title = `抽取笔记 ${子笔记._id}`
        a.className = `snote-extract`
        try { range.surroundContents(a) } catch (e) {
            console.error(e)
        } // bug
        console.log('surround', a)
        //  document.execCommand('createLink', false, 子笔记链接);
        // document.execCommand("insertHTML", false, "<a href='" + encodeURIComponent(子笔记链接) + "'>" + document.getSelection() + "</a>");
        // 笔记格式调整()
    }
    const 笔记正文抽取 = async () => {
        const iframe = document.createElement('iframe')
        iframe.src = `data:text/html;charset=utf-8,${encodeURI(html.current)}`
        iframe.style.visibility = 'hidden'
        document.body.appendChild(iframe);
        const dom = (iframe.contentDocument ?? iframe.contentWindow.document)
        dom.open(); dom.write(html.current); dom.close()
        const reader = new Readability(dom).parse()
        iframe.remove()
        // console.debug('current', reader, dom.body.innerHTML, html.current)
        await 笔记添加({ 内容: reader.content, 上级: _id })
    }
    const 格式加粗 = () => { document.execCommand('bold', false, null) }
    const 格式下划线 = () => { document.execCommand('underline', false, null) }
    const 格式斜体 = () => { document.execCommand('italic', false, null) }
    const 按键处理 = evt => {
        const hotkey = [evt.ctrlKey, evt.altKey, evt.shiftKey]
            .map((e, i) => e ? '^!+'[i] : '').join('') + evt.key.toLowerCase()
        const action = ({
            'escape': () => { 模式切换(模式); evt.currentTarget.blur() },
            '!enter': () => 模式切换("复习"),
            '!delete': () => 删除笔记(),
            '!backspace': () => 删除笔记(),
            '!f': 笔记格式调整,
            '^v': () => { setTimeout(笔记格式调整, 200); return true },
            '!x': 笔记抽取,
            '^b': 格式加粗,
            '^u': 格式下划线,
            '^i': 格式斜体,
            '!1': () => state.模式 === '复习' && 笔记复习('难'),
            '!2': () => state.模式 === '复习' && 笔记复习('中'),
            '!3': () => state.模式 === '复习' && 笔记复习('易'),
            '!v': 笔记正文抽取,
        })[hotkey]
        if (!action) return console.log(hotkey)
        if (!action()) { evt.preventDefault(); evt.stopPropagation() }
    };
    return (!state.隐藏 &&
        <div id={'snote-' + _id} className='snote-note' style={笔记样式} /* title={_标题} */>
            <div style={{ textAlign: 'right', background:'#0077ff88'}}>
                <details style={{ display: "inline-block" }}><summary>{相对时间获取(创建于)}</summary><a href={'/view#' + _id} title={调试信息}>删</a></details>
                &nbsp;
                <a href={'/view#' + _id} title={调试信息}>引</a>
            </div>
            <ContentEditable
                html={html.current}
                // spellCheck='false'
                // ref={ce => ce && ce.focus()}
                className={{ '学习': 'learn' }[state.模式]}
                onKeyDown={按键处理}
                onFocus={() => {
                    模式 === '浏览' && 模式切换('编辑')
                    模式 === '学习' && 模式切换('复习')
                }}
                // onBlur={() => {
                //     setTimeout(() => 模式切换(模式), 200)
                // }}
                onChange={编辑处理}
                style={{ maxHeight: '80vh', overflow: 'auto' }}
            // disabled={state.模式 !== '编辑'}
            // contentEditable={(state.模式 !== '编辑').toString()}
            // readOnly={state.模式 !== '编辑'}
            />
            {/* {state.模式 === '复习' && <ContentEditable html={html.current} onChange={编辑处理} disabled={true} />} */}
            {state.模式 === '编辑' && <div style={{ background: 'lightyellow' }}>
                <button title="双击删除" onClick={删除笔记}>删除</button>
            </div>}
            {入门 && state.模式 !== '浏览' && <button onClick={() => 模式切换('浏览')}>浏览</button>}
            {入门 && state.模式 !== '编辑' && <button onClick={() => 模式切换('编辑')}>编辑</button >}
            {入门 && state.模式 !== '复习' && <button onClick={() => 模式切换('复习')}>复习</button >}
            {state.模式 === '复习' && <>
                {笔记?.复习史?.map(({ 选项 }) => 选项).join('')}
                <button onClick={() => 笔记复习('难')}><u>1</u> 难 / {笔记复习规划(笔记, '难').描述}</button>
                <button onClick={() => 笔记复习('中')}><u>2</u> 中 / {笔记复习规划(笔记, '中').描述}</button>
                <button onClick={() => 笔记复习('易')}><u>3</u> 易 / {笔记复习规划(笔记, '易').描述}</button>
                {/* <button onClick={evt => 笔记复习(evt, '撤')}>4 撤</button> */}
            </>
            }

            {/* <button title="双击删除" onDoubleClick={删除笔记}>删除</button> */}
        </div >)
}

function Note({ _id, 模式, 列表加载, 笔记添加 }) {
    const [state, setState] = useState({ 状态: '少女发呆中...' });
    // 模式：编辑|浏览|复习
    const 笔记加载 = async () => {
        state.状态 = '⏳ 少女祈祷中...'
        return await 笔记库.findOne({ _id })
            .then(笔记 => { try { setState({ 笔记, 状态: '少女施法中...' }); } catch (e) { console.error(e); } })
            .catch(e => { try { setState({ 状态: '少女哭泣中：' + e.toString() }); } catch (e) { console.error(e); } });
    }
    if (state.状态 === '少女发呆中...') 笔记加载()
    return state.状态 === '少女施法中...' && state.笔记
        ? <NoteLoaded 笔记={state.笔记} {...{ 模式, 列表加载, 笔记添加, 笔记加载 }} />
        : <div style={笔记样式}>{state.状态}</div> // 占位
}

export function NoteListPanel({ 模式 = '浏览' }) {
    const [state, setState] = useState({ 状态: '少女发呆中...' })
    console.log('NoteListPanel', state);
    const 正则生成 = 搜索文本 => { try { return new RegExp(搜索文本) } catch (e) { return 搜索文本 } }
    state.搜索文本 = window.location.hash.slice(1)
    const 笔记添加 = async ({ 内容 = '', 上级 = undefined } = {}, { 立即显示 = true } = {}) => {
        const { _id } = await 笔记库.insert({ 内容, 上级, 序号: await 笔记库.count() + 1, 创建于: new Date(), })
        await 笔记库.update({ _id: 上级 }, { $addToSet: { 下级: _id } }).catch(error => console.log('更新上级笔记出错', error))

        if (立即显示) {
            await 列表加载()
            let counter = 0
            const timer = setInterval(() => {
                const 新笔记内容元素 = document.querySelector(`#snote-${_id}`)?.querySelector(`div[contenteditable]`)
                if (新笔记内容元素) { 新笔记内容元素.focus();; clearInterval(timer) }
                if (counter++ > 10) { clearInterval(timer) }
            }, 16)
        }

        return { _id }
    }
    async function 搜索(搜索文本 = null) {
        if (搜索文本 !== null)
            window.location.hash = encodeURIComponent(搜索文本);
        state.搜索文本 = decodeURIComponent(window.location.hash.slice(1));
        await 列表加载();
    }
    useEffect(() => {
        const f = () => 搜索()
        window.addEventListener('hashchange', f, false)
        return () => window.removeEventListener('hashchange', f, false)
    });
    const 搜索框变更 = async evt => await 搜索(evt.target.value)
    const 列表加载 = async () => {
        //只刷新id不刷新内容
        state.状态 = '⏳ 少女祈祷中...'
        const 删除条件 = { 删除于: { $exists: false } }
        const 搜索条件 = !state.搜索文本 ? {} : {
            $or: [
                { _id: state.搜索文本 },
                { 内容: 正则生成(state.搜索文本) }
            ]
        }
        console.log(搜索条件);
        const 一般显示条件 = { ...删除条件, ...搜索条件 }
        const 今天晚上12点整 = new Date(+new Date(new Date().toDateString()) + 86400e3)
        const 复习时间条件 = { $or: [{ 将复习于: { $lt: 今天晚上12点整 } }, { 将复习于: { $exists: false } }] }

        let 查询指针 = null
        if (['浏览', '编辑'].includes(模式)) 查询指针 = 笔记库
            .find({ ...一般显示条件 }, { _id: 1 }) // 这一步只取摘要，每个笔记单独加载自己
            .sort({ 将复习于: 1 })
            .sort({ 创建于: -1 })
        if (['学习', '复习'].includes(模式)) 查询指针 = 笔记库
            .find({ ...一般显示条件, ...复习时间条件 }, { _id: 1 }) // 这一步只取摘要，每个笔记单独加载自己
            .sort({ 将复习于: 1 })
            .sort({ 创建于: -1 })
        查询指针 && await 查询指针
            .then(笔记列 => { try { setState({ 笔记列, 状态: '少女施法中...' }); } catch (e) { console.error(e) } })
            .catch(e => { try { setState({ 状态: '少女哭泣中：' + e.toString() }); } catch (e) { console.error(e) } })
    }
    const 导入 = async () => { }
    const 按键处理 = async evt => {
        const hotkey = [evt.ctrlKey, evt.altKey, evt.shiftKey]
            .map((e, i) => e ? '^!+'[i] : '').join('') + evt.key.toLowerCase()
        const action = ({
            'escape': () => document.querySelector('#search').click(),
            '!f': () => document.querySelector('#search').focus(),
            '!a': () => document.querySelector('#add').click(),
            '!i': () => document.querySelector('#import').click(),
            '!z': () => console.log('撤销笔记操作（例如删除笔记和复习之类……）'),
            '!+z': () => console.log('重做笔记操作（例如删除笔记和复习之类……）'),
            // '!a': () => console.log('添加'),
        })[hotkey]
        if (!action) return console.log(hotkey);
        if (!action()) { evt.preventDefault(); evt.stopPropagation() }
    }
    const 搜索框按键处理 = async evt => {
        const hotkey = [evt.ctrlKey, evt.altKey, evt.shiftKey]
            .map((e, i) => e ? '^!+'[i] : '').join('') + evt.key.toLowerCase()
        const action = ({
            'escape': () => 搜索(),
        })[hotkey]
        if (!action) return console.log(hotkey);
        if (!action()) { evt.preventDefault(); evt.stopPropagation() }
    }
    if (state.状态 === '少女发呆中...') 列表加载()

    return (<div role="button" tabIndex='0' onKeyDown={按键处理}>
        <header className='snote-header'>
            <div style={{
                float: 'right',
                margin: '0.2em',
            }}>
                搜索：
            <input onChange={搜索框变更} title='Alt + F' id='search' value={state.搜索文本} onKeyDown={搜索框按键处理} />
                <button onClick={笔记添加} title='Alt + A' id='add'>添加</button>
                <button onClick={导入} title='Alt + I' id='import'>导入</button>
                {/* <button onClick={配置} title='Alt + S'>配置</button> */}
            </div>
            <div style={{ background: 'lightskyblue', lineHeight: '2em' }}>
                <span style={{ margin: '0 0.5em 0 2em' }}>雪星手账</span>
                <span style={{ margin: '0 0.5em' }}>{模式 === '浏览' ? '浏览中' : <a href='/view'>去浏览</a>}</span>
                <span style={{ margin: '0 0.5em' }}>{模式 === '学习' ? '学习中' : <a href='/learn'>去学习</a>}</span>
            </div>
        </header>
        <div className='snote-container'>
            {!state.笔记列 ? <div className='snote-list'>state.状态</div>
                : !state.笔记列.length ? <ReviewDone></ReviewDone>
                    : <div className='snote-list'>
                        {state.笔记列.map(({ _id }) =>
                            // <LazyLoad height={64} offset={512}>
                            <Note key={_id} {...{ _id, 模式, 列表加载, 笔记添加 }}></Note>
                            // </LazyLoad>
                        )}
                    </div>
            }
        </div>
    </div>)
}
function ReviewDone() {
    return '你已经完成了今天的所有复习！是时候寻找新的学习材料啦～'
}

export function Learn() {
    return <NoteListPanel 模式='学习'></NoteListPanel>
}

export function Review() {
    return <NoteListPanel 模式='复习'></NoteListPanel>
}

export function View() {
    return <NoteListPanel 模式='浏览'></NoteListPanel>
}

export function Edit() {
    return <NoteListPanel 模式='编辑'></NoteListPanel>
}

(async () => {
    (global || window).笔记库 = 笔记库; // DEBUG
    await 笔记库初始化();
    // await 笔记库全量读取();
    // console.log(笔记列);
})();