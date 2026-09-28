import { client } from '../packages/db/src/index';

interface MataKuliahItem {
  kode_mk: string;
  mata_kuliah: string;
  jurusan: string;
  sks: number;
  status: string;
  semester: string;
}

const dataTI: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNTI251205', mata_kuliah: 'Etika Profesi', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251301', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251202', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251203', mata_kuliah: 'Bahasa Inggris I', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKTI251301', mata_kuliah: 'Dasar Pemrograman', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'PRTI251201', mata_kuliah: 'Kalkulus I', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'PRTI251202', mata_kuliah: 'Logika Matematika', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251204', mata_kuliah: 'Pendidikan Agama', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251208', mata_kuliah: 'Pendidikan Pancasila', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251215', mata_kuliah: 'Pendidikan Agama (Katolik)', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNTI251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNTI252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'FKTI252302', mata_kuliah: 'Algoritma dan Struktur Data I', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNTI252207', mata_kuliah: 'Bahasa Inggris II', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRTI252203', mata_kuliah: 'Kalkulus II', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRTI252304', mata_kuliah: 'Matriks dan Transformasi Vektor', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'FKTI252303', mata_kuliah: 'Pemrograman Berorientasi Objek', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNTI252209', mata_kuliah: 'Pend. Kewarganegaraan', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRTI252305', mata_kuliah: 'Sistem Digital', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'PRTI253306', mata_kuliah: 'Algoritma dan Struktur Data II', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRTI253207', mata_kuliah: 'Arsitektur dan Organisasi Komputer', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRTI253309', mata_kuliah: 'Matematika Diskrit', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'FKTI253304', mata_kuliah: 'Basis Data I', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRTI253308', mata_kuliah: 'Komunikasi data', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRTI253310', mata_kuliah: 'Multimedia', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRTI253311', mata_kuliah: 'Rekayasa Perangkat Lunak', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRTI254312', mata_kuliah: 'Basis Data II', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRTI254313', mata_kuliah: 'Data Science', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKTI254305', mata_kuliah: 'Jaringan Komputer', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKTI254306', mata_kuliah: 'Kecerdasan Buatan', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKTI254307', mata_kuliah: 'Pemrograman Web I', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRTI254314', mata_kuliah: 'Probabilitas dan Statistik', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKTI254208', mata_kuliah: 'Sistem Operasi', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRTI255215', mata_kuliah: 'Analisa Numerik', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'PRTI255319', mata_kuliah: 'Pengolahan Citra', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKTI255309', mata_kuliah: 'Machine Learning', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRTI255317', mata_kuliah: 'Metode Penelitian', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRTI255320', mata_kuliah: 'Penjaminan Kualitas Perangkat Lunak', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRTI255318', mata_kuliah: 'Pemrograman Web II', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRTI255316', mata_kuliah: 'Interaksi Manusia Komputer', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'PRTI256223', mata_kuliah: 'Manajemen Proyek', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '6' },
  { kode_mk: 'PRTI256322', mata_kuliah: 'Deep Learning', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRTI256324', mata_kuliah: 'Pemrograman Mobile', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRTI256321', mata_kuliah: 'Cloud Computing and Big Data', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRTI257425', mata_kuliah: 'Capstone Project', jurusan: 'Teknik Informatika', sks: 4, status: 'wajib', semester: '7' },
  { kode_mk: 'UNTI257210', mata_kuliah: 'Kewirausahaan', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRTI257326', mata_kuliah: 'Pemrograman Game', jurusan: 'Teknik Informatika', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRTI257227', mata_kuliah: 'Teori Bahasa dan Automata', jurusan: 'Teknik Informatika', sks: 2, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRTI258628', mata_kuliah: 'Tugas Akhir', jurusan: 'Teknik Informatika', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'MPTI25P313', mata_kuliah: 'Teknologi Basis Data (Oracle)', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P314', mata_kuliah: 'Visualisasi Data', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P308', mata_kuliah: 'Pemrograman Android', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P305', mata_kuliah: 'Internet of Things', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P303', mata_kuliah: 'Computer Vision', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P302', mata_kuliah: 'Aplikasi Enterprise', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P304', mata_kuliah: 'Evolutionary Computation', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P307', mata_kuliah: 'Networking Advanced', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P312', mata_kuliah: 'Sistem Informasi Geografis', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P311', mata_kuliah: 'Recommender System', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P309', mata_kuliah: 'Pengolahan Bahasa Alami', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P306', mata_kuliah: 'Keamanan Data dan Informasi', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P301', mata_kuliah: 'Animasi dan Pemodelan 3D', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPTI25P310', mata_kuliah: 'Realitas Virtual dan Augmentasi', jurusan: 'Teknik Informatika', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

const dataSI: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNSI251205', mata_kuliah: 'Etika Profesi IT', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251301', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251202', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251203', mata_kuliah: 'Bahasa Inggris I', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'PRSI251219', mata_kuliah: 'Pengantar Teknologi Informasi', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKSI251304', mata_kuliah: 'Dasar Pemrograman', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'PRSI251225', mata_kuliah: 'Kalkulus', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251208', mata_kuliah: 'Pendidikan Agama', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251210', mata_kuliah: 'Pendidikan Pancasila', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251215', mata_kuliah: 'Pendidikan Agama (Katolik)', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSI251217', mata_kuliah: 'Pendidikan Agama (Hindu)', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNSI252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'FKSI252302', mata_kuliah: 'Sistem Basis Data', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNSI252204', mata_kuliah: 'Bahasa Inggris II', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSI252301', mata_kuliah: 'Dasar Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSI252226', mata_kuliah: 'Matematika Diskrit', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'FKSI252305', mata_kuliah: 'Pemrograman Berorientasi Objek', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNSI252209', mata_kuliah: 'Pendidikan Kewarganegaraan', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSI252320', mata_kuliah: 'Manajemen Proses Bisnis', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'FKSI253301', mata_kuliah: 'Algoritma dan Struktur Data', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSI253227', mata_kuliah: 'Aljabar Linear dan Matriks', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSI253203', mata_kuliah: 'Jaringan Komputer', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSI253306', mata_kuliah: 'Pemrograman Web I', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSI253321', mata_kuliah: 'Pemrograman Basis Data', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSI253209', mata_kuliah: 'Sistem Operasi', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSI253302', mata_kuliah: 'Analisis dan Desain Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSI253207', mata_kuliah: 'Kecerdasan Buatan', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRSI254303', mata_kuliah: 'Data Warehouse dan Business Intelligence', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254304', mata_kuliah: 'Enterprise Information System', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254305', mata_kuliah: 'Data Mining', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254306', mata_kuliah: 'Interaksi Manusia dan Komputer', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254307', mata_kuliah: 'Pemrograman Web II', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254208', mata_kuliah: 'Pengujian dan Implementasi Sistem', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSI254309', mata_kuliah: 'Analisis Data Statistik', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRSI255310', mata_kuliah: 'Metode Penelitian', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSI255311', mata_kuliah: 'Multimedia', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKSI255308', mata_kuliah: 'Machine Learning', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSI255312', mata_kuliah: 'Pemrograman Mobile', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSI255313', mata_kuliah: 'Arsitektur SI/TI Perusahaan', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSI255314', mata_kuliah: 'Perencanaan Strategis Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSI255215', mata_kuliah: 'Pengantar Cloud Computing', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'PRSI256316', mata_kuliah: 'Tata Kelola Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRSI256317', mata_kuliah: 'Audit Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'UNSI256207', mata_kuliah: 'Kewirausahaan', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '6' },
  { kode_mk: 'PRSI256318', mata_kuliah: 'Visualisasi Data', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRSI257428', mata_kuliah: 'Capstone Project', jurusan: 'Sistem Informasi', sks: 4, status: 'wajib', semester: '7' },
  { kode_mk: 'PRSI257222', mata_kuliah: 'Manajemen Proyek SI', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRSI257323', mata_kuliah: 'Keamanan Sistem Informasi', jurusan: 'Sistem Informasi', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRSI257224', mata_kuliah: 'Manajemen Resiko SI', jurusan: 'Sistem Informasi', sks: 2, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRSI258629', mata_kuliah: 'Tugas Akhir', jurusan: 'Sistem Informasi', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'MPSI25P301', mata_kuliah: 'Perencanaan Keberlangsungan Bisnis', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P302', mata_kuliah: 'Teknologi Blockchain', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P303', mata_kuliah: 'Inovasi SI di Organisasi dan Masyarakat', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P304', mata_kuliah: 'Transformasi Digital', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P305', mata_kuliah: 'Sistem Informasi Perbankan', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P306', mata_kuliah: 'Natural Language Processing', jurusan: 'Sistem Informasi', sks: 1, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P307', mata_kuliah: 'Enterprise Application Integration', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P308', mata_kuliah: 'Supply Chain Management', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P309', mata_kuliah: 'e-Business', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P310', mata_kuliah: 'Manajemen Kualitas SI/TI', jurusan: 'Sistem Informasi', sks: 5, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P311', mata_kuliah: 'Sistem Informasi Akuntansi', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSI25P312', mata_kuliah: 'Time Series Analysis', jurusan: 'Sistem Informasi', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

const dataSK: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNSK251205', mata_kuliah: 'Etika Profesi', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251215', mata_kuliah: 'Pendidikan Agama (Katolik)', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251301', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251202', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251203', mata_kuliah: 'Bahasa Inggris I', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKSK251301', mata_kuliah: 'Dasar Pemrograman', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'PRSK251201', mata_kuliah: 'Logika Matematika', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'PRSK251202', mata_kuliah: 'Matematika dasar', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251204', mata_kuliah: 'Pendidikan Agama', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNSK251207', mata_kuliah: 'Pendidikan Pancasila', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNSK252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'FKSK252302', mata_kuliah: 'Algoritma dan Struktur Data', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNSK252208', mata_kuliah: 'Bahasa Inggris II', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSK252303', mata_kuliah: 'Elektronika Dasar', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSK252304', mata_kuliah: 'Matrik dan Transformasi vektor', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNSK252209', mata_kuliah: 'Pendidikan Kewarganegaraan', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSK252205', mata_kuliah: 'Pengantar Sistem Komputer', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRSK252306', mata_kuliah: 'Sistem Digital', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'PRSK253207', mata_kuliah: 'Antar Muka Periperal', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSK253303', mata_kuliah: 'Basis Data', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSK253208', mata_kuliah: 'Fisika', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSK253309', mata_kuliah: 'Komunikasi Data', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSK253310', mata_kuliah: 'Matematika Diskrit', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSK253311', mata_kuliah: 'Mikro Komputer', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRSK253212', mata_kuliah: 'Pengantar Teknologi Mekatronika', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'FKSK253204', mata_kuliah: 'Sistem Operasi', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRSK254313', mata_kuliah: 'Arsitektur dan Organisasi Komputer', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSK254314', mata_kuliah: 'Interaksi Manusia dan Robot', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKSK254305', mata_kuliah: 'Jaringan Komputer I', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKSK254306', mata_kuliah: 'Pemrograman Web', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSK254215', mata_kuliah: 'Probabilitas dan Statistik', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSK254316', mata_kuliah: 'Rekayasa Perangkat Lunak', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRSK254317', mata_kuliah: 'Sistem Tertanam', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRSK255218', mata_kuliah: 'Analisa Kinerja Sistem', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSK255319', mata_kuliah: 'Jaringan Komputer II', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKSK255207', mata_kuliah: 'Kecerdasan Buatan', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSK255320', mata_kuliah: 'Komputer Grafik', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSK255321', mata_kuliah: 'Metode Penelitian', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKSK255308', mata_kuliah: 'Pemrograman Berorientasi Objek', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRSK255422', mata_kuliah: 'Robotika', jurusan: 'Sistem Komputer', sks: 4, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'PRSK256323', mata_kuliah: 'IoT Platform', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRSK256324', mata_kuliah: 'Keamanan Komputer dan Jaringan', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRSK256325', mata_kuliah: 'Machine Learning', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRSK256226', mata_kuliah: 'Manajemen Proyek TIK', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRSK257327', mata_kuliah: 'Administrasi Sistem Jaringan', jurusan: 'Sistem Komputer', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRSK257428', mata_kuliah: 'Capstone Project', jurusan: 'Sistem Komputer', sks: 4, status: 'wajib', semester: '7' },
  { kode_mk: 'UNSK257210', mata_kuliah: 'Kewirausahaan', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRSK257229', mata_kuliah: 'Pemrosesan Paralel', jurusan: 'Sistem Komputer', sks: 2, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRSK258630', mata_kuliah: 'Tugas Akhir', jurusan: 'Sistem Komputer', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'MPSK25P303', mata_kuliah: 'Computer Vision in IoT', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P308', mata_kuliah: 'Pengolahan Signal Digital', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P309', mata_kuliah: 'Sistem Waktu Nyata', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P310', mata_kuliah: 'Teknik Kendali', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P304', mata_kuliah: 'Cyber Security in IoT', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P302', mata_kuliah: 'Aktuator dan Sensor', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P305', mata_kuliah: 'Mobile Computing', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P307', mata_kuliah: 'Network Advanced', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P306', mata_kuliah: 'Natural Language Processing', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPSK25P301', mata_kuliah: '3D Modelling', jurusan: 'Sistem Komputer', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

const dataKU: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNKU251201', mata_kuliah: 'Pendidikan Agama', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251202', mata_kuliah: 'Pendidikan Pancasila', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251204', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251207', mata_kuliah: 'Bahasa Inggris Bisnis 1', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKKU251204', mata_kuliah: 'Pengantar Bisnis', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251210', mata_kuliah: 'Pengantar Kewirausahaan', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKKU251302', mata_kuliah: 'Matematika Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251309', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251205', mata_kuliah: 'Etika Profesi dan Bisnis', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNKU251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNKU252203', mata_kuliah: 'Pendidikan Kewarganegaraan', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'UNKU252208', mata_kuliah: 'Bahasa Inggris Bisnis 2', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRKU252304', mata_kuliah: 'Manajemen Usaha Kecil dan Menengah', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'FKKU252205', mata_kuliah: 'Sistem Informasi Bisnis', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRKU252206', mata_kuliah: 'Pengantar Akuntansi', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRKU252201', mata_kuliah: 'Dinamika Kewirausahaan', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRKU252308', mata_kuliah: 'Pemasaran Inovatif dalam Kewirausahaan', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRKU252209', mata_kuliah: 'Pengantar Ekonomi Dan Perbankan', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'UNKU252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'PRKU253310', mata_kuliah: 'Akuntansi Biaya', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253211', mata_kuliah: 'Manajemen Operasional Bisnis', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253212', mata_kuliah: 'Kepemimpinan dan Pengembangan Organisasi', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253213', mata_kuliah: 'Perilaku Konsumen', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253302', mata_kuliah: 'Statistika Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PDKU253302', mata_kuliah: 'E-Business Dan Start-Up Business', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253207', mata_kuliah: 'Bisnis Keluarga (Family Business)', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRKU253315', mata_kuliah: 'Perpajakan', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRKU254316', mata_kuliah: 'Product Knowledge', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRKU254317', mata_kuliah: 'Pengambilan Keputusan dan Negosiasi', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRKU254303', mata_kuliah: 'Statistika Multivariat Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRKU254225', mata_kuliah: 'Pengelolaan Keuangan Bisnis', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '4' },
  { kode_mk: 'PRKU254318', mata_kuliah: 'Business Innovation and Creativity', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRKU254320', mata_kuliah: 'Studi Kelayakan Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRKU255331', mata_kuliah: 'Riset Operasional Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRKU255322', mata_kuliah: 'Penganggaran Perusahaan', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRKU255323', mata_kuliah: 'Perencanaan Usaha dan Inovasi', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PDKU255201', mata_kuliah: 'Hukum Bisnis Dan Perdata', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'FKKU255301', mata_kuliah: 'Komunikasi Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKKU255303', mata_kuliah: 'Metodologi Penelitian Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'PRKU256326', mata_kuliah: 'Strategi Bisnis', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256314', mata_kuliah: 'Workshop Kewirausahaan', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256205', mata_kuliah: 'Presentasi dan Ekshibisi Usaha', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256329', mata_kuliah: 'Digital Marketing', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256330', mata_kuliah: 'Supply Chain Management', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256321', mata_kuliah: 'Analisis Resiko dan Investasi', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRKU256324', mata_kuliah: 'Bisnis International', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRKU257435', mata_kuliah: 'Capstone Projek', jurusan: 'Kewirausahaan', sks: 4, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257228', mata_kuliah: 'Socialpreneurship', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257232', mata_kuliah: 'Entrepreneurial Market', jurusan: 'Kewirausahaan', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257327', mata_kuliah: 'Laboratorium Kewirausahaan', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257333', mata_kuliah: 'Strategi Pengembangan Produk', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257334', mata_kuliah: 'Tata Kelola dan Pengembangan Ruang Usaha', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRKU257319', mata_kuliah: 'Brand and Selling Management', jurusan: 'Kewirausahaan', sks: 3, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRKU258636', mata_kuliah: 'Tugas Akhir', jurusan: 'Kewirausahaan', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'KNKU25P311', mata_kuliah: 'Franchise And Reseller Business', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P312', mata_kuliah: 'Psikologi Penjualan', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P321', mata_kuliah: 'Business Analytics', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P322', mata_kuliah: 'Teknologi E-commerce', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P331', mata_kuliah: 'Bussiness Analytics', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P332', mata_kuliah: 'Web Design', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P341', mata_kuliah: 'Strategi Public Relation', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KNKU25P342', mata_kuliah: 'Mitra Kerja Event Organizer', jurusan: 'Kewirausahaan', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

const dataMN: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNMN251205', mata_kuliah: 'Etika Profesi dan Bisnis', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251209', mata_kuliah: 'Pendidikan Agama', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251210', mata_kuliah: 'Pend. Pancasila', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251202', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251203', mata_kuliah: 'Bahasa Inggris Untuk Bisnis 1', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKMN251302', mata_kuliah: 'Matematika Bisnis', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'PRMN251220', mata_kuliah: 'Pengantar Akuntansi I', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'PRMN251223', mata_kuliah: 'Pengantar Ekonomi Mikro', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN253106', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251215', mata_kuliah: 'Pendidikan Agama (Katolik)', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNMN251218', mata_kuliah: 'Pendidikan Agama (Kong Hu Cu)', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNMN252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'UNMN252208', mata_kuliah: 'Pend. Kewarganegaraan', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'UNMN252204', mata_kuliah: 'Bahasa Inggris Untuk Bisnis II', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'FKMN252204', mata_kuliah: 'Pengantar Bisnis', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRMN252322', mata_kuliah: 'Pengantar Manajemen', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'KPMN252304', mata_kuliah: 'Statistika Bisnis I', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRMN252324', mata_kuliah: 'Pengantar Ekonomi Makro', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRMN252321', mata_kuliah: 'Pengantar Akuntansi II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'KPMN253202', mata_kuliah: 'Hukum Bisnis', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRMN253305', mata_kuliah: 'Manajemen Pemasaran I', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRMN253306', mata_kuliah: 'Manajemen Keuangan I', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRMN253307', mata_kuliah: 'Manajemen Sumber Daya Manusia I', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRMN253308', mata_kuliah: 'Manajemen Operasi I', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'KPMN253305', mata_kuliah: 'Statistika Bisnis II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRMN253301', mata_kuliah: 'Akuntansi Biaya', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRMN254302', mata_kuliah: 'Akuntansi Manajemen', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRMN254309', mata_kuliah: 'Manajemen Stratejik', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRMN254310', mata_kuliah: 'Manajemen Pemasaran II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRMN254311', mata_kuliah: 'Manajemen Keuangan II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRMN254312', mata_kuliah: 'Manajemen Sumber Daya Manusia II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRMN254313', mata_kuliah: 'Manajemen Operasi II', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'FKMN254205', mata_kuliah: 'Sistem Informasi Manajemen', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRMN255328', mata_kuliah: 'Studi Kelayakan Bisnis', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRMN255314', mata_kuliah: 'Manajemen Sains', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'UNMN255207', mata_kuliah: 'Kewirausahaan', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'PRMN255315', mata_kuliah: 'Penganggaran Perusahaan', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'FKMN255303', mata_kuliah: 'Metodologi Penelitian Bisnis', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRMN255325', mata_kuliah: 'Perilaku Keorganisasian', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRMN25316', mata_kuliah: 'Manajemen Lembaga Keuangan', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'PRMN256326', mata_kuliah: 'Perencanaan Bisnis', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRMN256317', mata_kuliah: 'Manajemen Mutu', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRMN256303', mata_kuliah: 'Analisis Laporan Keuangan', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRMN256227', mata_kuliah: 'Pasar Keuangan', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '6' },
  { kode_mk: 'KPMN256303', mata_kuliah: 'Perekonomian Indonesia', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'FKMN256301', mata_kuliah: 'Komunikasi Bisnis dan Negosiasi', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRMN256318', mata_kuliah: 'Manajemen Risiko Bisnis', jurusan: 'Manajemen', sks: 3, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRMN257219', mata_kuliah: 'Manajemen Perbankan', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'KPMN257201', mata_kuliah: 'E-Business', jurusan: 'Manajemen', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRMN257404', mata_kuliah: 'Proyek Penelitian', jurusan: 'Manajemen', sks: 4, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRMN258629', mata_kuliah: 'Tugas Akhir', jurusan: 'Manajemen', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'KKMN257301', mata_kuliah: 'Seminar Manajemen Keuangan', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KKMN257302', mata_kuliah: 'E-Finance', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KKMN257303', mata_kuliah: 'Manajemen Hutang dan Aset', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KKMN257304', mata_kuliah: 'Manajemen Investasi', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KPMN257301', mata_kuliah: 'Seminar Manajemen Pemasaran', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KPMN257302', mata_kuliah: 'E-Commerce', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KPMN257303', mata_kuliah: 'Perilaku Konsumen', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KPMN257304', mata_kuliah: 'Pemasaran Digital', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KSMN257301', mata_kuliah: 'Seminar Manajemen SDM', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KSMN257302', mata_kuliah: 'Manajemen Kinerja SDM', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KSMN257303', mata_kuliah: 'Manajemen Kompensasi', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KSMN257304', mata_kuliah: 'Manajemen Karir', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KOMN257301', mata_kuliah: 'Seminar Manajemen Operasi', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KOMN257302', mata_kuliah: 'Manajemen Rantai Pasokan', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KOMN257303', mata_kuliah: 'Pengembangan Produk dan Manajemen Inovasi', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'KOMN257304', mata_kuliah: 'Manajemen Pergudangan', jurusan: 'Manajemen', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

const dataBD: MataKuliahItem[] = [
  // Semester 1
  { kode_mk: 'UNBI251201', mata_kuliah: 'Pendidikan Agama', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251202', mata_kuliah: 'Pendidikan Pancasila', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251203', mata_kuliah: 'Bahasa Indonesia', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251204', mata_kuliah: 'Bahasa Inggris Bisnis I', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'FKBI251302', mata_kuliah: 'Matematika Bisnis', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'FKBI251201', mata_kuliah: 'Pengantar Bisnis', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'PRBI251201', mata_kuliah: 'Teori Ekonomi', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251306', mata_kuliah: 'Aplikasi Perkantoran', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251205', mata_kuliah: 'Etika Profesi dan Bisnis', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251214', mata_kuliah: 'Pendidikan Agama (Budha)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251215', mata_kuliah: 'Pendidikan Agama (Katolik)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },
  { kode_mk: 'UNBI251216', mata_kuliah: 'Pendidikan Agama (Protestan)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '1' },

  // Semester 2
  { kode_mk: 'UNBI252201', mata_kuliah: 'Pendidikan Kewarganegaraan', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'UNBI252202', mata_kuliah: 'Bahasa Inggris Bisnis II', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRBI252302', mata_kuliah: 'Algoritma dan Pemrograman', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRBI252301', mata_kuliah: 'Model Bisnis Digital', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRBI252312', mata_kuliah: 'Dasar Teknologi Informasi', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'PRBI252303', mata_kuliah: 'Pengantar Akuntansi', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '2' },
  { kode_mk: 'UNBI252206', mata_kuliah: 'Kecakapan Antar Personal', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '2' },
  { kode_mk: 'PRBI252204', mata_kuliah: 'Hukum Bisnis', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '2' },

  // Semester 3
  { kode_mk: 'UNBI253203', mata_kuliah: 'Kewirausahaan', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253303', mata_kuliah: 'Pemasaran Digital (Digital Marketing)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253304', mata_kuliah: 'Strategi Pemasaran dan Optimalisasi Media Sosial (Social Media Marketing/Optimization)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253205', mata_kuliah: 'Manajemen Strategik', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253206', mata_kuliah: 'Manajemen Rantai Pasok (Supply Chains Management)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253307', mata_kuliah: 'Desain Grafis dan Branding Digital', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '3' },
  { kode_mk: 'FKBI253203', mata_kuliah: 'Sistem Informasi Manajemen', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '3' },
  { kode_mk: 'PRBI253305', mata_kuliah: 'Statistika Bisnis I', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '3' },

  // Semester 4
  { kode_mk: 'PRBI254306', mata_kuliah: 'Statistika Bisnis II', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254201', mata_kuliah: 'Berpikir Design (Design Thinking)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254302', mata_kuliah: 'Sistem Multimedia', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254303', mata_kuliah: 'Analisis Bisnis dan Big Data', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254304', mata_kuliah: 'Manajemen Keamanan Siber(Cyber Security Management)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254305', mata_kuliah: 'Manajemen Keuangan', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },
  { kode_mk: 'PRBI254306', mata_kuliah: 'Kewirausahaan Bisnis Rintisan(Start Up)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '4' },

  // Semester 5
  { kode_mk: 'PRBI255201', mata_kuliah: 'Transaksi Digital dan Fintech', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '5' },
  { kode_mk: 'FKBI255304', mata_kuliah: 'Metodologi Penelitian Bisnis', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRBI255302', mata_kuliah: 'Basis Data Digital Geospasial', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRBI255303', mata_kuliah: 'Manajemen Resiko', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRBI255304', mata_kuliah: 'Intelijen Bisnis dan Pemasaran Strategis (Business and Marketing Intelligent)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '5' },
  { kode_mk: 'PRBI255305', mata_kuliah: 'Analisis Perilaku Konsumen Digital (Digital Consumer Behaviour Analysis)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '5' },

  // Semester 6
  { kode_mk: 'FKBI256305', mata_kuliah: 'Komunikasi Bisnis', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRBI256308', mata_kuliah: 'Perekonomian Indonesia', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRBI256301', mata_kuliah: 'Pengembangan Platform Pasar Daring (Marketplace Development)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRBI256202', mata_kuliah: 'Manajemen UMKM dan Koperasi', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '6' },
  { kode_mk: 'PRBI256303', mata_kuliah: 'Manajemen Pariwisata', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '6' },
  { kode_mk: 'PRBI256304', mata_kuliah: 'Studi kelayakan bisnis', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '6' },

  // Semester 7
  { kode_mk: 'PRBI257210', mata_kuliah: 'E-Bisnis', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRBI257402', mata_kuliah: 'Proyek Penelitian', jurusan: 'Bisnis Digital', sks: 4, status: 'wajib', semester: '7' },
  { kode_mk: 'PRBI257301', mata_kuliah: 'Riset Pasar dan Analisis Persaingan Usaha (Market Research And Competitor Analysis)', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRBI257303', mata_kuliah: 'Seminar Digital Marketing', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '7' },
  { kode_mk: 'PRBI257209', mata_kuliah: 'Analisis Media Sosial (Social Media Analysis)', jurusan: 'Bisnis Digital', sks: 2, status: 'wajib', semester: '7' },
  { kode_mk: 'PRBI257304', mata_kuliah: 'Web Design', jurusan: 'Bisnis Digital', sks: 3, status: 'wajib', semester: '7' },

  // Semester 8
  { kode_mk: 'PRBI258601', mata_kuliah: 'Tugas Akhir', jurusan: 'Bisnis Digital', sks: 6, status: 'wajib', semester: '8' },

  // Matakuliah Pilihan
  { kode_mk: 'MPBI255311', mata_kuliah: 'Riset Bisnis Rintisan Digital (Riset Digital Startup Business)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI256312', mata_kuliah: 'Pratikum Rintisan Usaha (Start-up Studio)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI257313', mata_kuliah: 'Simulasi presentasi wirausaha dan investasi (Pitching & Business Fundraising Simulation)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI255321', mata_kuliah: 'Teknik Pemasaran dan Optimisasi Mesin Pencari (Search Engine Marketing/Optimization)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI256322', mata_kuliah: 'Simulasi Pemasaran Digital (Digital Marketing Campaign Lab)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI257323', mata_kuliah: 'Strategi konten dan identitas merek ( content marketing dan branding)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI255331', mata_kuliah: 'Perancangan dan Simulasi UI/UX untuk Produk Fintech (Fintech Product Design & UI/UX Simulation)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI256332', mata_kuliah: 'Simulasi Sistem Pembayaran Digital & E-Wallet', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
  { kode_mk: 'MPBI257333', mata_kuliah: 'Regulasi & Keamanan Siber Fintech (Case-Based)', jurusan: 'Bisnis Digital', sks: 3, status: 'pilihan', semester: 'Pilihan' },
];

async function main() {
  console.log('1. Ensuring table mata_kuliah exists and has proper unique constraint...');
  await client`
    CREATE TABLE IF NOT EXISTS public.mata_kuliah (
      id SERIAL PRIMARY KEY,
      kode_mk VARCHAR(50) NOT NULL,
      mata_kuliah VARCHAR(255) NOT NULL,
      jurusan VARCHAR(100) NOT NULL,
      sks INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL,
      semester VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `;

  // Drop old 2-column unique constraint if present, and create 3-column unique constraint
  await client`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_mata_kuliah_kode_jurusan'
      ) THEN
        ALTER TABLE public.mata_kuliah DROP CONSTRAINT uq_mata_kuliah_kode_jurusan;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_mata_kuliah_kode_mk_jurusan'
      ) THEN
        ALTER TABLE public.mata_kuliah ADD CONSTRAINT uq_mata_kuliah_kode_mk_jurusan UNIQUE (kode_mk, mata_kuliah, jurusan);
      END IF;
    END $$;
  `;

  const allData = [...dataTI, ...dataSI, ...dataSK, ...dataKU, ...dataMN, ...dataBD];
  console.log(`2. Upserting ${allData.length} records (TI: ${dataTI.length}, SI: ${dataSI.length}, SK: ${dataSK.length}, KU: ${dataKU.length}, MN: ${dataMN.length}, BD: ${dataBD.length})...`);
  
  for (const item of allData) {
    await client`
      INSERT INTO public.mata_kuliah (kode_mk, mata_kuliah, jurusan, sks, status, semester)
      VALUES (${item.kode_mk}, ${item.mata_kuliah}, ${item.jurusan}, ${item.sks}, ${item.status}, ${item.semester})
      ON CONFLICT (kode_mk, mata_kuliah, jurusan) DO UPDATE SET
        sks = EXCLUDED.sks,
        status = EXCLUDED.status,
        semester = EXCLUDED.semester;
    `;
  }

  const countRes = await client`SELECT jurusan, count(*), sum(sks) as total_sks FROM public.mata_kuliah GROUP BY jurusan ORDER BY jurusan;`;
  console.log('Success! Summary by jurusan:', countRes);

  const totalRes = await client`SELECT count(*) FROM public.mata_kuliah;`;
  console.log(`Total records in mata_kuliah: ${totalRes[0].count}`);

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
