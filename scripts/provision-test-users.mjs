import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sharedPassword = process.env.EIKP_TEST_SHARED_PASSWORD;

if (!url || !serviceRoleKey || !sharedPassword) {
  throw new Error(
    "Isi NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan EIKP_TEST_SHARED_PASSWORD di .env.local.",
  );
}

if (sharedPassword.length < 12) {
  throw new Error("Password uji coba minimal harus 12 karakter.");
}

const units = [
  "IGD",
  "ICU,PICU",
  "NICU",
  "BOROBUDUR 1 A",
  "BOROBUDUR 1B",
  "BOROBUDUR 2",
  "BOROBUDUR 3",
  "CANDI NGAWEN",
  "CANDI PAWON",
  "CANDI SELOGRIYO",
  "CANDI MENDUT",
  "IBS",
  "POLIKLINIK",
  "VK",
  "PONEK",
  "CSSD",
  "AMBULANCE",
  "KAMAR JENAZAH",
  "IPSRS",
  "LAUNDRY",
  "GIZI",
  "PENDAFTARAN RAWAT JALAN",
  "REKAM MEDIS",
];

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getLoginEmail(unit) {
  const username = unit
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${username}@eikp.invalid`;
}

const { data: userPage, error: listError } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (listError) {
  throw new Error(`Gagal membaca daftar akun Supabase: ${listError.message}`);
}

const existingUsers = new Map(
  userPage.users.map((user) => [user.email?.toLowerCase(), user]),
);

for (const unit of units) {
  const email = getLoginEmail(unit);
  let user = existingUsers.get(email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: sharedPassword,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Gagal membuat akun untuk ${unit}: ${error.message}`);
    }

    user = data.user;
    existingUsers.set(email, user);
  }

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, unit, role: "pelapor" }, { onConflict: "id" });

  if (profileError) {
    throw new Error(`Gagal menyiapkan profil ${unit}: ${profileError.message}`);
  }
}

console.log(`Berhasil menyiapkan ${units.length} akun Pelapor uji coba.`);
console.log("Password tidak ditampilkan. Akun memakai nama unit sebagai username.");
