document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const fileNameSpan = document.getElementById('file-name');
  const fileRemoveBtn = document.getElementById('file-remove');
  const submitBtn = document.getElementById('submit-btn');
  const loadingBox = document.getElementById('loading-box');
  const errorBox = document.getElementById('error-box');
  const resultSection = document.getElementById('result-section');
  const copyAllBtn = document.getElementById('copy-all-btn');

  const accessCodeContainer = document.getElementById('access-code-container');
  const accessCodeInput = document.getElementById('access-code-input');
  const accessCodeSubmit = document.getElementById('access-code-submit');

  const card1Content = document.getElementById('card1-content');
  const card2List = document.getElementById('card2-list');
  const card3Grid = document.getElementById('card3-grid');

  let currentFile = null;
  let lastAnalysisResult = null;
  let toastTimer = null;

  function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    toastMsg.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 2500);
  }

  function handleFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('PDF 파일만 업로드할 수 있습니다.');
      resetFile();
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast('4MB 이하의 PDF만 업로드할 수 있습니다.');
      resetFile();
      return;
    }

    currentFile = file;
    fileNameSpan.textContent = file.name;
    fileInfo.classList.remove('hidden');
    submitBtn.removeAttribute('disabled');
    errorBox.classList.add('hidden');
    showToast('PDF 파일이 준비되었습니다.');
  }

  function resetFile() {
    currentFile = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    submitBtn.setAttribute('disabled', 'true');
  }

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-600', 'bg-indigo-50');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-50');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  fileRemoveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
  });

  accessCodeSubmit.addEventListener('click', () => {
    const code = accessCodeInput.value.trim();
    if (code) {
      sessionStorage.setItem('accessCode', code);
      accessCodeContainer.classList.add('hidden');
      showToast('접속 코드가 저장되었습니다. 다시 분석을 진행해 주세요.');
    } else {
      showToast('접속 코드를 입력해 주세요.');
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (!currentFile) {
      showToast('먼저 PDF 파일을 업로드해 주세요.');
      return;
    }

    submitBtn.setAttribute('disabled', 'true');
    loadingBox.classList.remove('hidden');
    errorBox.classList.add('hidden');
    resultSection.classList.add('hidden');

    const accessCode = accessCodeInput.value.trim() || sessionStorage.getItem('accessCode') || '';

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(accessCode ? { 'x-access-code': accessCode } : {})
        },
        body: currentFile
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.code === 'ACCESS_CODE_REQUIRED') {
          sessionStorage.removeItem('accessCode');
          accessCodeContainer.classList.remove('hidden');
          accessCodeInput.value = '';
          accessCodeInput.focus();
        }
        const errorMsg = data.error || `요청에 실패했습니다. (HTTP 상태코드 ${response.status})`;
        errorBox.textContent = errorMsg;
        errorBox.classList.remove('hidden');
        return;
      }

      lastAnalysisResult = data;
      renderResults(data);
      resultSection.classList.remove('hidden');
      resultSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      errorBox.textContent = '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      errorBox.classList.remove('hidden');
    } finally {
      loadingBox.classList.add('hidden');
      submitBtn.removeAttribute('disabled');
    }
  });

  function renderResults(data) {
    // 보안 규칙 준수: innerHTML 사용 금지, textContent 사용
    card1Content.textContent = data.card1_easy_explanation || '';

    card2List.replaceChildren();
    const takeaways = data.card2_takeaways || [];
    takeaways.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'flex items-start space-x-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 shadow-sm';

      const badge = document.createElement('span');
      badge.className = 'shrink-0 w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow';
      badge.textContent = String(index + 1);

      const p = document.createElement('p');
      p.className = 'text-slate-700 text-sm sm:text-base leading-relaxed font-medium';
      p.textContent = item;

      li.replaceChildren(badge, p);
      card2List.appendChild(li);
    });

    card3Grid.replaceChildren();
    const cardNews = data.card3_card_news || [];
    cardNews.forEach((slideText, index) => {
      const slideNum = String(index + 1).padStart(2, '0');

      const cardDiv = document.createElement('div');
      cardDiv.className = 'bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-lg flex flex-col justify-between space-y-4 border border-slate-800';

      const topRow = document.createElement('div');
      topRow.className = 'flex items-center justify-between';

      const slideLabel = document.createElement('span');
      slideLabel.className = 'text-xs font-bold tracking-wider text-indigo-400 uppercase';
      slideLabel.textContent = `Slide 0${slideNum} / 04`;

      const tagBadge = document.createElement('span');
      tagBadge.className = 'bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-lg';
      tagBadge.textContent = 'Card News';

      topRow.replaceChildren(slideLabel, tagBadge);

      const p = document.createElement('p');
      p.className = 'text-sm sm:text-base text-slate-200 leading-relaxed font-medium';
      p.textContent = slideText;

      cardDiv.replaceChildren(topRow, p);
      card3Grid.appendChild(cardDiv);
    });
  }

  copyAllBtn.addEventListener('click', async () => {
    if (!lastAnalysisResult) {
      showToast('복사할 결과가 없습니다.');
      return;
    }

    const takeawaysText = (lastAnalysisResult.card2_takeaways || [])
      .map((item, idx) => `${idx + 1}. ${item}`)
      .join('\n\n');

    const cardNewsText = (lastAnalysisResult.card3_card_news || [])
      .map((item, idx) => `[슬라이드 ${idx + 1}]\n${item}`)
      .join('\n\n');

    const fullText = `[초등학생도 이해하는 쉬운 말 해설]
${lastAnalysisResult.card1_easy_explanation || ''}

[핵심 테이크어웨이]
${takeawaysText}

[SNS 카드뉴스 슬라이드]
${cardNewsText}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showToast('전체 결과가 클립보드에 복사되었습니다!');
    } catch (err) {
      showToast('복사에 실패했습니다. 직접 선택해서 복사해 주세요.');
    }
  });
});