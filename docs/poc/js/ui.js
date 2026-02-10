export class UIManager {
  constructor() {
    this.confirmCallback = null;
  }

  showConfirm(msg, cb) {
    this.confirmCallback = cb;
    document.getElementById('confirm-message').innerText = msg;
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-box');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      box.classList.remove('scale-95');
      box.classList.add('scale-100');
    });
  }

  closeConfirm() {
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-box');
    modal.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      this.confirmCallback = null;
    }, 300);
  }

  handleConfirmYes() {
    if (this.confirmCallback) this.confirmCallback();
    this.closeConfirm();
  }

  showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('i');
    document.getElementById('toast-msg').innerText = msg;
    icon.className = isError
      ? 'fas fa-exclamation-circle text-red-500 text-base'
      : 'fas fa-check-circle text-emerald-500 text-base';
    toast.classList.remove('translate-y-24');
    setTimeout(() => toast.classList.add('translate-y-24'), 2500);
  }

  toggleSection(sectionId) {
    const content = document.getElementById(`content-${sectionId}`);
    const icon = document.getElementById(`icon-${sectionId}`);
    if (content.classList.contains('open')) {
      content.classList.remove('open');
      icon.style.transform = 'rotate(0deg)';
    } else {
      content.classList.add('open');
      icon.style.transform = 'rotate(180deg)';
    }
  }

  setupDragScroll() {
    const container = document.getElementById('canvas-container');
    let isDown = false;
    let startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.glass') || e.target.closest('button')) return;
      isDown = true;
      container.classList.add('cursor-grabbing');
      startX = e.pageX - container.offsetLeft;
      startY = e.pageY - container.offsetTop;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.classList.remove('cursor-grabbing');
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.classList.remove('cursor-grabbing');
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      container.scrollLeft = scrollLeft - (x - startX) * 1.5;
      container.scrollTop = scrollTop - (y - startY) * 1.5;
    });
  }
}
