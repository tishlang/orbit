// An island: default export mounts into the placeholder element.
export default function mount(el, props) {
  let n = props.start ?? 0
  const btn = document.createElement('button')
  btn.className = 'px-3 py-1 rounded bg-brand-500 text-white'
  const render = () => { btn.textContent = `Clicked ${n} times` }
  btn.onclick = () => { n++; render() }
  render()
  el.replaceChildren(btn)
}
