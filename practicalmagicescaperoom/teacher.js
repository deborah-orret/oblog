const studentLink = document.getElementById('student-link');
studentLink.value = new URL('index.html', location.href).href;
document.getElementById('copy-link').addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(studentLink.value);
    status.textContent = 'Student link copied.';
  } catch (error) {
    studentLink.focus();
    studentLink.select();
    status.textContent = 'Copy the selected student link using Ctrl+C or Command+C.';
  }
});
