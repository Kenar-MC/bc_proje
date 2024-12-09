import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// __dirname oluştur
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON dosyasının yolu
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// JSON dosyasını okuma ve yazma işlevleri
function readDatabase() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Kullanıcı menüsü
const program = new Command();

program
    .name("Uniswap V2 DEX Sim")
    .description("Uniswap V2 tabanlı DEX simülasyonu")
    .version("1.0.0");

// Likidite Ekleme İşlevi
async function addLiquidity() {
    const data = readDatabase();
    
    // Kullanıcıdan sadece bir token miktarı alıyoruz
    const { tokenA } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tokenA',
            message: 'Havuza eklemek istediğiniz Token A miktarı:',
            validate: (value) => !isNaN(value) && value > 0
        }
    ]);

    // Token B miktarını Token A'ya eşit olarak hesaplıyoruz
    const tokenAMin = parseFloat(tokenA);
    const tokenBMin = tokenAMin; // Eşit oranla eklenmesi için Token B de aynı miktarda olacak

    data.pool.tokenA += tokenAMin;
    data.pool.tokenB += tokenBMin;
    data.pool.K = data.pool.tokenA * data.pool.tokenB; // K değerini güncelle

    writeDatabase(data);
    console.log(chalk.green('Likidite başarıyla eklendi!'));
}

// Swap İşlevi
async function swapTokens() {
    const data = readDatabase();
    const { swapDirection, amount } = await inquirer.prompt([
        {
            type: 'list',
            name: 'swapDirection',
            message: 'Hangi işlemi yapmak istiyorsunuz?',
            choices: ['Token A -> Token B', 'Token B -> Token A']
        },
        {
            type: 'input',
            name: 'amount',
            message: 'Swap yapmak istediğiniz miktar:',
            validate: (value) => !isNaN(value) && value > 0
        }
    ]);

    const swapAmount = parseFloat(amount);

    if (swapDirection === 'Token A -> Token B') {
        if (swapAmount > data.userBalance.tokenA) {
            console.log(chalk.red('Yetersiz Token A bakiyesi!'));
            return;
        }

        const tokenBReceived = data.pool.tokenB - (data.pool.K / (data.pool.tokenA + swapAmount));
        data.userBalance.tokenA -= swapAmount;
        data.userBalance.tokenB += tokenBReceived;
        data.pool.tokenA += swapAmount;
        data.pool.tokenB -= tokenBReceived;

    } else {
        if (swapAmount > data.userBalance.tokenB) {
            console.log(chalk.red('Yetersiz Token B bakiyesi!'));
            return;
        }

        const tokenAReceived = data.pool.tokenA - (data.pool.K / (data.pool.tokenB + swapAmount));
        data.userBalance.tokenB -= swapAmount;
        data.userBalance.tokenA += tokenAReceived;
        data.pool.tokenB += swapAmount;
        data.pool.tokenA -= tokenAReceived;
    }

    writeDatabase(data);
    console.log(chalk.green('Swap işlemi başarıyla gerçekleştirildi!'));
}

// Havuz Durumu Görüntüleme
function viewPoolStatus() {
    const data = readDatabase();
    console.log(chalk.blue('Likidite Havuzu Durumu:'));
    console.table(data.pool);
}

// Kullanıcı Bakiyesi Görüntüleme
function viewUserBalance() {
    const data = readDatabase();
    console.log(chalk.blue('Kullanıcı Bakiyesi:'));
    console.table(data.userBalance);
}

// Çıkış
function exitProgram() {
    console.log(chalk.yellow('Çıkış yapılıyor...'));
    process.exit(0);
}

// Komutları tanımla
program
    .command('menu')
    .description('DEX kullanıcı menüsünü açar')
    .action(async () => {
        while (true) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: 'Bir işlem seçin:',
                    choices: [
                        'Likidite Ekle',
                        'Swap',
                        'Havuz Durumunu Görüntüle',
                        'Kullanıcı Bakiyesini Görüntüle',
                        'Çıkış'
                    ]
                }
            ]);

            switch (choice) {
                case 'Likidite Ekle':
                    await addLiquidity();
                    break;
                case 'Swap':
                    await swapTokens();
                    break;
                case 'Havuz Durumunu Görüntüle':
                    viewPoolStatus();
                    break;
                case 'Kullanıcı Bakiyesini Görüntüle':
                    viewUserBalance();
                    break;
                case 'Çıkış':
                    exitProgram();
                    break;
            }
        }
    });

program.parse(process.argv);
