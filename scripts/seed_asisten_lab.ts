import { client } from '../packages/db/src/index';

interface AsistenLabData {
  nama: string;
  kampus: string;
  ruangan: string;
  nomor_lab: string;
  peran: string;
  is_active: boolean;
}

const asistenList: AsistenLabData[] = [
  // Kampus Kobar
  {
    nama: 'Dwi Cahya Medika',
    kampus: 'Kampus Kobar',
    ruangan: 'Labor 1.5',
    nomor_lab: '1.5',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Iqbal Prasetyo',
    kampus: 'Kampus Kobar',
    ruangan: 'Labor 1.6',
    nomor_lab: '1.6',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'M. Ghali Nugroho',
    kampus: 'Kampus Kobar',
    ruangan: 'Labor 1.7',
    nomor_lab: '1.7',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Haikal Wais Alqorni',
    kampus: 'Kampus Kobar',
    ruangan: 'Labor 1.8',
    nomor_lab: '1.8',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'M.Raffi Pra Diestyawan',
    kampus: 'Kampus Kobar',
    ruangan: 'Labor 1.9',
    nomor_lab: '1.9',
    peran: 'PJ Lab',
    is_active: true,
  },

  // Kampus Thehok
  {
    nama: 'Isodorus Bakti Pangestu',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 1.3',
    nomor_lab: '1.3',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Ahmad Idris',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 1.4',
    nomor_lab: '1.4',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Delvio Pasha',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 1.5',
    nomor_lab: '1.5',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Bayu Zaidan Azizi',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 2.7',
    nomor_lab: '2.7',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Rezky Cahya Gandana',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 3.1',
    nomor_lab: '3.1',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Andi Noor',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 3.2',
    nomor_lab: '3.2',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Zuan Vivaldi',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 3.4',
    nomor_lab: '3.4',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Trio Prananda',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 4.1',
    nomor_lab: '4.1',
    peran: 'PJ Lab',
    is_active: true,
  },
  {
    nama: 'Rafli Maulana',
    kampus: 'Kampus Thehok',
    ruangan: 'Labor 4.3',
    nomor_lab: '4.3',
    peran: 'PJ Lab',
    is_active: true,
  },
];

async function main() {
  console.log('🚀 Memulai migrasi dan seeding database Asisten Lab...');

  try {
    // 1. Buat tabel asisten_lab jika belum ada
    await client`
      CREATE TABLE IF NOT EXISTS public.asisten_lab (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        nim VARCHAR(30),
        kampus VARCHAR(100) NOT NULL DEFAULT 'Kampus Kobar',
        ruangan VARCHAR(100) NOT NULL,
        nomor_lab VARCHAR(20),
        peran VARCHAR(50) NOT NULL DEFAULT 'PJ Lab',
        kontak VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
      );
    `;
    console.log('✅ Tabel public.asisten_lab terverifikasi / dibuat.');

    // 2. Buat Unique Index untuk mencegah duplikasi
    await client`
      CREATE UNIQUE INDEX IF NOT EXISTS asisten_lab_kampus_ruangan_nama_idx 
      ON public.asisten_lab (kampus, ruangan, nama);
    `;
    console.log('✅ Index asisten_lab_kampus_ruangan_nama_idx terverifikasi.');

    // 3. Upsert data asisten lab Kobar & Thehok
    for (const item of asistenList) {
      await client`
        INSERT INTO public.asisten_lab (
          nama,
          kampus,
          ruangan,
          nomor_lab,
          peran,
          is_active,
          updated_at
        ) VALUES (
          ${item.nama},
          ${item.kampus},
          ${item.ruangan},
          ${item.nomor_lab},
          ${item.peran},
          ${item.is_active},
          now()
        )
        ON CONFLICT (kampus, ruangan, nama)
        DO UPDATE SET
          nomor_lab = EXCLUDED.nomor_lab,
          peran = EXCLUDED.peran,
          is_active = EXCLUDED.is_active,
          updated_at = now();
      `;
      console.log(`✨ Tersimpan: ${item.nama} -> ${item.ruangan} (${item.kampus})`);
    }

    // 4. Verifikasi isi tabel
    const rows = await client`
      SELECT id, nama, kampus, ruangan, nomor_lab, peran, is_active 
      FROM public.asisten_lab 
      ORDER BY kampus ASC, ruangan ASC;
    `;

    console.log('\n📋 Data Asisten Lab saat ini di Database:');
    console.table(rows);

    console.log('\n🎉 Selesai seeding Asisten Lab Kobar & Thehok!');
  } catch (err) {
    console.error('❌ Gagal seeding asisten lab:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
