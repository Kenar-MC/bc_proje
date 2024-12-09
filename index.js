// Gerekli modülleri içe aktar
import fs from 'fs';  // Dosya okuma ve yazma işlemleri için 'fs' modülünü içe aktar
import path from 'path';  // Dosya ve dizin yolları üzerinde işlem yapabilmek için 'path' modülünü içe aktar
import { Command } from 'commander';  // Komut satırı arayüzü için 'commander' modülünü içe aktar
import inquirer from 'inquirer';  // Kullanıcıdan giriş almak için 'inquirer' modülünü içe aktar
import chalk from 'chalk';  // Konsola renkli yazılar yazdırmak için 'chalk' modülünü içe aktar
import { fileURLToPath } from 'url';  // Dosya URL'si için 'url' modülünden 'fileURLToPath' fonksiyonunu içe aktar

// __dirname oluştur: modülün bulunduğu dizini almak için
const __filename = fileURLToPath(import.meta.url);  // 'import.meta.url' ile mevcut dosyanın URL'sini al ve onu dosya yoluna dönüştür
const __dirname = path.dirname(__filename);  // Dosyanın bulunduğu dizini al

// JSON dosyasının yolu
const DB_PATH = path.join(__dirname, 'data', 'database.json');  // 'database.json' dosyasının tam yolunu oluştur

// JSON dosyasını okuma ve yazma işlevleri
// JSON dosyasını okumak için fonksiyon
function readDatabase() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));  // JSON dosyasını okur ve içeriğini JSON formatında döndürür
}

// JSON dosyasına yazma işlemi için fonksiyon
function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');  // JSON verisini belirtilen dosyaya yazar
}

// Kullanıcı menüsü oluşturuluyor
const program = new Command();  // Yeni bir 'Commander' programı başlat

program
    .name("Uniswap V2 DEX Sim")  // Programın adı
    .description("Uniswap V2 tabanlı DEX simülasyonu")  // Program açıklaması
    .version("1.0.0");  // Programın versiyon numarası

// Likidite ekleme işlemi için fonksiyon
async function addLiquidity() {
    const data = readDatabase();  // JSON dosyasını oku

    // Kullanıcıdan likidite miktarlarını al
    const { tokenA, tokenB } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tokenA',  // Kullanıcıdan Token A miktarını al
            message: 'Havuza eklemek istediğiniz Token A miktarı:',  // Mesaj
            validate: (value) => !isNaN(value) && value > 0  // Geçerli bir sayı olup olmadığını kontrol et
        },
        {
            type: 'input',
            name: 'tokenB',  // Kullanıcıdan Token B miktarını al
            message: 'Havuza eklemek istediğiniz Token B miktarı:',  // Mesaj
            validate: (value) => !isNaN(value) && value > 0  // Geçerli bir sayı olup olmadığını kontrol et
        }
    ]);

    // Havuzdaki token miktarlarını güncelle
    data.pool.tokenA += parseFloat(tokenA);  // Token A miktarını havuza ekle
    data.pool.tokenB += parseFloat(tokenB);  // Token B miktarını havuza ekle
    data.pool.K = data.pool.tokenA * data.pool.tokenB;  // 'K' sabitini güncelle (Uniswap mantığı)

    writeDatabase(data);  // Veritabanını güncelle
    console.log(chalk.green('Likidite başarıyla eklendi!'));  // Başarılı bir mesaj yazdır
}

// Swap işlemi için fonksiyon
async function swapTokens() {
    const data = readDatabase();  // JSON dosyasını oku
    // Kullanıcıdan swap işlemi için yön ve miktar al
    const { swapDirection, amount } = await inquirer.prompt([
        {
            type: 'list',  // Seçim yapılacak bir liste sun
            name: 'swapDirection',  // Seçilen yön
            message: 'Hangi işlemi yapmak istiyorsunuz?',  // Mesaj
            choices: ['Token A -> Token B', 'Token B -> Token A']  // İki seçenek sun
        },
        {
            type: 'input',
            name: 'amount',  // Kullanıcının gireceği miktar
            message: 'Swap yapmak istediğiniz miktar:',  // Mesaj
            validate: (value) => !isNaN(value) && value > 0  // Geçerli bir sayı olup olmadığını kontrol et
        }
    ]);

    const swapAmount = parseFloat(amount);  // Kullanıcı tarafından girilen miktarı sayı olarak al

    if (swapDirection === 'Token A -> Token B') {  // Token A’dan Token B’ye işlem yapılıyorsa
        if (swapAmount > data.userBalance.tokenA) {  // Eğer yeterli Token A bakiyesi yoksa
            console.log(chalk.red('Yetersiz Token A bakiyesi!'));  // Hata mesajı
            return;  // Fonksiyonu durdur
        }

        // Token B alınacak miktarı hesapla
        const tokenBReceived = data.pool.tokenB - (data.pool.K / (data.pool.tokenA + swapAmount));
        // Kullanıcı bakiyelerini güncelle
        data.userBalance.tokenA -= swapAmount;
        data.userBalance.tokenB += tokenBReceived;
        // Havuz bakiyelerini güncelle
        data.pool.tokenA += swapAmount;
        data.pool.tokenB -= tokenBReceived;

    } else {  // Token B’den Token A’ya işlem yapılıyorsa
        if (swapAmount > data.userBalance.tokenB) {  // Eğer yeterli Token B bakiyesi yoksa
            console.log(chalk.red('Yetersiz Token B bakiyesi!'));  // Hata mesajı
            return;  // Fonksiyonu durdur
        }

        // Token A alınacak miktarı hesapla
        const tokenAReceived = data.pool.tokenA - (data.pool.K / (data.pool.tokenB + swapAmount));
        // Kullanıcı bakiyelerini güncelle
        data.userBalance.tokenB -= swapAmount;
        data.userBalance.tokenA += tokenAReceived;
        // Havuz bakiyelerini güncelle
        data.pool.tokenB += swapAmount;
        data.pool.tokenA -= tokenAReceived;
    }

    writeDatabase(data);  // Veritabanını güncelle
    console.log(chalk.green('Swap işlemi başarıyla gerçekleştirildi!'));  // Başarılı bir mesaj yazdır
}

// Havuz durumunu görüntüleme işlemi için fonksiyon
function viewPoolStatus() {
    const data = readDatabase();  // JSON dosyasını oku
    console.log(chalk.blue('Likidite Havuzu Durumu:'));  // Mesaj
    console.table(data.pool);  // Havuz verilerini tablolama formatında yazdır
}

// Kullanıcı bakiyesini görüntüleme işlemi için fonksiyon
function viewUserBalance() {
    const data = readDatabase();  // JSON dosyasını oku
    console.log(chalk.blue('Kullanıcı Bakiyesi:'));  // Mesaj
    console.table(data.userBalance);  // Kullanıcı bakiyelerini tablolama formatında yazdır
}

// Çıkış işlemi için fonksiyon
function exitProgram() {
    console.log(chalk.yellow('Çıkış yapılıyor...'));  // Çıkış mesajını yazdır
    process.exit(0);  // Programı sonlandır
}

// Komutları tanımla
program
    .command('menu')  // 'menu' komutunu tanımla
    .description('DEX kullanıcı menüsünü açar')  // Komut açıklaması
    .action(async () => {  // Komut çalıştırıldığında yapılacak işlemler
        while (true) {  // Sonsuz bir döngü başlat
            const { choice } = await inquirer.prompt([  // Kullanıcıya seçim yaptır
                {
                    type: 'list',  // Liste ile seçim yapılacak
                    name: 'choice',  // Seçim ismi
                    message: 'Bir işlem seçin:',  // Mesaj
                    choices: [  // Seçilebilecek seçenekler
                        'Likidite Ekle',
                        'Swap',
                        'Havuz Durumunu Görüntüle',
                        'Kullanıcı Bakiyesini Görüntüle',
                        'Çıkış'
                    ]
                }
            ]);

            switch (choice) {  // Kullanıcının seçimine göre işlem yap
                case 'Likidite Ekle':  // Eğer 'Likidite Ekle' seçilmişse
                    await addLiquidity();  // Likidite ekleme işlemi yap
                    break;
                case 'Swap':  // Eğer 'Swap' seçilmişse
                    await swapTokens();  // Swap işlemi yap
                    break;
                case 'Havuz Durumunu Görüntüle':  // Eğer 'Havuz Durumunu Görüntüle' seçilmişse
                    viewPoolStatus();  // Havuz durumunu göster
                    break;
                case 'Kullanıcı Bakiyesini Görüntüle':  // Eğer 'Kullanıcı Bakiyesini Görüntüle' seçilmişse
                    viewUserBalance();  // Kullanıcı bakiyesini göster
                    break;
                case 'Çıkış':  // Eğer 'Çıkış' seçilmişse
                    exitProgram();  // Programı sonlandır
                    break;
            }
        }
    });

program.parse(process.argv);  // Komut
