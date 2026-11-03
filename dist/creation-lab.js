const creationForm = document.querySelector('#creation-prompt');
if (creationForm) {
  const input = creationForm.querySelector('textarea');
  const preview = document.querySelector('.prompt-preview');
  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.prompt;
      input.focus({preventScroll:true});
    });
  });
  creationForm.addEventListener('submit', event => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) {input.focus();return;}
    preview.querySelector('p').textContent = prompt;
    preview.hidden = false;
  });
}
document.querySelectorAll('[data-lab-prompt]').forEach(link => link.addEventListener('click', () => {
  const input = document.querySelector('#creation-idea');
  if (input) input.value = link.dataset.labPrompt;
}));
