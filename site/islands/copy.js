// Copies the install command: <button> inside the island, the text in props.text.
export default function mount(el, props) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'copy'
  b.textContent = 'Copy'
  b.setAttribute('aria-label', 'Copy the command')
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(props.text); b.textContent = 'Copied' } catch { b.textContent = 'Select and copy' }
    setTimeout(() => { b.textContent = 'Copy' }, 1600)
  })
  el.appendChild(b)
}
