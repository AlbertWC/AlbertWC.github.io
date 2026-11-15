// "Message on LinkedIn": LinkedIn cannot pre-fill a message from a link, so copy the preset hello
// to the clipboard, say so, and let the link open the profile as normal. Without JS the link still works.
export function initContact() {
  const toast = document.querySelector('[data-toast]');
  let timer;
  const show = msg => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('is-on'), 4000);
  };
  document.querySelectorAll('[data-copy]').forEach(a => a.addEventListener('click', () => {
    const text = a.dataset.copy;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => show('Message copied. Paste it into LinkedIn.'),
        () => show(`Copy this: "${text}"`),
      );
    } else show(`Copy this: "${text}"`);
  }));
}
