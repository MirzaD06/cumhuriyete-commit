export const CONFIG = {
  repo: 'MirzaD06/cumhuriyete-commit',
  finalTime: '2026-10-29T19:23:00+03:00',
  // Saniye cinsinden final animasyonu süresi; son 103 piksel bu sürede tek tek yanar.
  finalDuration: 23,
  goals: { commits: 1670, lessons: 150, provinces: 25 },
  // Boş bırakılan bağlantılar sayfada "yakında" olarak görünür.
  formUrl: 'https://forms.gle/yErk3pun1tgzzmhE9',
  dersKitiUrl: 'ders-kiti.html',
  liveUrl: '',
  // Alıştırma sayfasındaki "Dersimi bildir" düğmesi formu bu alanlar dolu olarak açar.
  // Kimlikler Google Form'daki soru kimlikleridir; form yeniden oluşturulursa güncellenmelidir.
  formPrefill: {
    viewUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeQtcwgKycpLjWIHotmCRV7vDz6U-Xf5_NHHxJyG442dhOI7w/viewform',
    typeEntry: 'entry.2091459853',
    typeLesson: 'Ders: Millet Mektebi 2.0 kapsamında birine ilk kod dersini verdim',
    firstLineEntry: 'entry.439950504',
  },
  pyodideUrl: 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/',
};
