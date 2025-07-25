// Carregar imagens
const images = {};
const imageFiles = [
    { name: 'player', src: 'player.png' },
    { name: 'hud', src: 'HUD.png' },
    { name: 'objetos', src: 'objetos.png' },
    { name: 'spritesheet', src: 'spritesheet.png' },
    { name: 'enemy_bat', src: 'enemy_bat.png' },
    { name: 'enemy_lava_man', src: 'enemy_lava_man.png' },
    { name: 'enemy_zunbi', src: 'enemy_zunbi.png' }
];
let loadedImages = 0;

imageFiles.forEach(img => {
    const image = new Image();
    image.src = img.src;
    image.onload = () => {
        loadedImages++;
        if (loadedImages === imageFiles.length) {
            startGame();
        }
    };
    images[img.name] = image;
});

// Setup canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Variáveis do jogo
let player, enemies, bullets, xp, xpMax, level, passives, gameOver, bossLevel;

// ESCALA GLOBAL DOS SPRITES
const SPRITE_SCALE = 2.5; // ajuste conforme necessário

// Estrutura para sons (adicione arquivos .mp3 ou .wav na pasta e descomente para usar)
// const sndAttack = new Audio('attack.wav');
// const sndHit = new Audio('hit.wav');
// const sndEnemyDie = new Audio('enemy_die.wav');

let score = 0;
let invincible = 0;

function startGame() {
    // Inicializar variáveis
    player = {
        x: 1000, // novo mundo maior
        y: 1000,
        w: 32 * SPRITE_SCALE,
        h: 32 * SPRITE_SCALE,
        speed: 3.2 * SPRITE_SCALE,
        maxSpeed: 3.2 * SPRITE_SCALE,
        dx: 0,
        dy: 0,
        hp: 50,
        maxHp: 50,
        damage: 10,
        xp: 0,
        level: 1,
        xpMax: 100,
        passives: [],
        weapon: 'sword',
        element: null,
    };
    enemies = [];
    bullets = [];
    xp = 0;
    xpMax = 100;
    level = 1;
    passives = [];
    gameOver = false;
    bossLevel = 5;
    score = 0;
    invincible = 0;
    spawnEnemies();
    requestAnimationFrame(gameLoop);
}

// Ajustar tipos de inimigos para escala
const enemyTypes = [
    {
        name: 'Zumbi',
        img: 'enemy_zunbi',
        w: 32 * SPRITE_SCALE, h: 32 * SPRITE_SCALE,
        baseHp: 30, baseSpeed: 2, baseDamage: 7
    },
    {
        name: 'Morcego',
        img: 'enemy_bat',
        w: 28 * SPRITE_SCALE, h: 20 * SPRITE_SCALE,
        baseHp: 18, baseSpeed: 3, baseDamage: 5
    },
    {
        name: 'Lava Man',
        img: 'enemy_lava_man',
        w: 36 * SPRITE_SCALE, h: 36 * SPRITE_SCALE,
        baseHp: 40, baseSpeed: 1.7, baseDamage: 10
    }
];
// Carregar imagens dos inimigos
for (const type of enemyTypes) {
    const image = new Image();
    image.src = type.img;
    images[type.img] = image;
}

function spawnEnemies() {
    const num = (level % bossLevel === 0) ? 1 : Math.min(3 + level, 10);
    for (let i = 0; i < num; i++) {
        let isBoss = (level % bossLevel === 0);
        // Escolher tipo de inimigo aleatório
        let type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        // Spawn nas bordas
        let edge = Math.floor(Math.random() * 4);
        let x, y;
        if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
        else if (edge === 1) { x = canvas.width - (isBoss ? 64 * SPRITE_SCALE : type.w); y = Math.random() * canvas.height; }
        else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
        else { x = Math.random() * canvas.width; y = canvas.height - (isBoss ? 64 * SPRITE_SCALE : type.h); }
        enemies.push({
            x, y,
            w: isBoss ? 64 * SPRITE_SCALE : type.w,
            h: isBoss ? 64 * SPRITE_SCALE : type.h,
            hp: isBoss ? 100 + level * 20 : type.baseHp + level * 5,
            maxHp: isBoss ? 100 + level * 20 : type.baseHp + level * 5,
            speed: isBoss ? 1.5 : type.baseSpeed + level * 0.1,
            damage: isBoss ? 20 : type.baseDamage + level,
            isBoss,
            type: type.name,
            img: type.img
        });
    }
}

// Controle de teclas
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true; // Garante que tanto minúsculo quanto maiúsculo sejam aceitos
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
});

// Ataque do jogador
let attackCooldown = 0;
canvas.addEventListener('mousedown', (e) => {
    if (gameOver) return;
    if (player.weapon === 'sword') {
        attackWithSword();
    } else if (player.weapon === 'pistol') {
        shootBullet(e.offsetX, e.offsetY);
    }
});

// Efeitos ativos nos inimigos
function applyElementalEffect(enemy) {
    if (player.element === 'veneno') {
        enemy.poison = { time: 120, damage: 1 }; // 2 segundos de veneno
    } else if (player.element === 'fogo') {
        enemy.hp -= 5; // Dano extra imediato
    } else if (player.element === 'gelo') {
        enemy.slow = { time: 60, factor: 0.5 };
    }
}

// Modificar ataque de espada e pistola para aplicar efeito
let gameOverMessage = '';

function gameLoop() {
    if (gameOver) {
        draw();
        drawGameOver();
        return;
    }
    if (!choosingUpgrade) {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function drawGameOver() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `<h2 style='color:red'>GAME OVER</h2><button style='font-size:20px' onclick='restartGame()'>Reiniciar</button>`;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
    ctx.font = '28px Arial';
    ctx.fillText('Clique em Reiniciar para jogar novamente', canvas.width/2, canvas.height/2 + 30);
    ctx.textAlign = 'left';
    ctx.restore();
}

window.restartGame = function() {
    document.getElementById('ui').innerHTML = '';
    startGame();
};

// Feedback visual de dano nos inimigos
function flashEnemy(enemy) {
    enemy.flash = 6;
}

// Feedback visual de dano no jogador
let playerHitFlash = 0;

// Modificar ataque para flash
function attackWithSword() {
    if (attackCooldown > 0) return;
    attackCooldown = 20;
    // sndAttack.play();
    for (let enemy of enemies) {
        let dist = Math.hypot(
            (player.x + player.w/2) - (enemy.x + enemy.w/2),
            (player.y + player.h/2) - (enemy.y + enemy.h/2)
        );
        if (dist < 80 * SPRITE_SCALE) { // alcance maior
            enemy.hp -= player.damage;
            flashEnemy(enemy);
            applyElementalEffect(enemy);
            if (enemy.hp <= 0) {
                gainXP(enemy.isBoss ? 50 : 10);
                if (enemy.isBoss) showBossDefeated();
                // sndEnemyDie.play();
            }
        }
    }
}

function shootBullet(tx, ty) {
    if (attackCooldown > 0) return;
    attackCooldown = 15;
    let angle = Math.atan2(ty - (player.y + player.h/2), tx - (player.x + player.w/2));
    bullets.push({
        x: player.x + player.w/2,
        y: player.y + player.h/2,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8,
        damage: player.damage,
        radius: 6,
        element: player.element,
    });
}

function showBossDefeated() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `<h2 style='color:gold'>Chefe derrotado!</h2>`;
    setTimeout(() => { ui.innerHTML = ''; }, 1500);
}

// Lista de passivas/ativas possíveis
const upgrades = [
    { name: 'Aumentar Dano', apply: () => player.damage += 5 },
    { name: 'Aumentar Velocidade', apply: () => player.speed += 0.5 },
    { name: 'Aumentar Velocidade Máxima', apply: () => player.maxSpeed += 0.5 },
    { name: 'Nova Arma: Pistola', apply: () => player.weapon = 'pistol' },
    { name: 'Dano Venenoso', apply: () => player.element = 'veneno' },
    { name: 'Dano de Fogo', apply: () => player.element = 'fogo' },
    { name: 'Dano de Gelo', apply: () => player.element = 'gelo' },
    // Pode adicionar mais upgrades aqui
];

let upgradeChoices = null;
let choosingUpgrade = false;

function gainXP(amount) {
    player.xp += amount;
    score += amount; // Pontuação baseada em XP ganho
    if (player.xp >= player.xpMax) {
        player.xp -= player.xpMax;
        player.level++;
        player.xpMax += 10; // Escalona dificuldade
        showUpgradeChoices();
    }
}

function showUpgradeChoices() {
    // Escolher 3 upgrades aleatórios
    upgradeChoices = [];
    let pool = upgrades.slice();
    for (let i = 0; i < 3; i++) {
        let idx = Math.floor(Math.random() * pool.length);
        upgradeChoices.push(pool[idx]);
        pool.splice(idx, 1);
    }
    choosingUpgrade = true;
    renderUpgradeChoices();
}

function renderUpgradeChoices() {
    const ui = document.getElementById('ui');
    ui.innerHTML = '<h2>Escolha um upgrade:</h2>' +
        upgradeChoices.map((upg, i) => `<button style='margin:10px;font-size:18px' onclick='chooseUpgrade(${i})'>${upg.name}</button>`).join('');
}

window.chooseUpgrade = function(idx) {
    if (!choosingUpgrade) return;
    upgradeChoices[idx].apply();
    player.passives.push(upgradeChoices[idx].name);
    choosingUpgrade = false;
    document.getElementById('ui').innerHTML = '';
};

// CÂMERA
const WORLD_SIZE = 3000;
let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = player.x + player.w/2 - canvas.width/2;
    camera.y = player.y + player.h/2 - canvas.height/2;
    // Limitar câmera ao mundo
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
}

function update() {
    // Movimentação em 8 direções
    let dx = 0, dy = 0;
    if (keys['w'] || keys['W'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['arrowright']) dx += 1;
    // Normalizar para diagonal
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        player.x += dx * player.speed;
        player.y += dy * player.speed;
        // Limitar aos limites do canvas
        player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
    }

    // Movimentação dos inimigos e colisão com jogador
    for (let enemy of enemies) {
        let ex = player.x + player.w/2 - (enemy.x + enemy.w/2);
        let ey = player.y + player.h/2 - (enemy.y + enemy.h/2);
        let dist = Math.sqrt(ex*ex + ey*ey);
        if (dist > 1) {
            ex /= dist;
            ey /= dist;
            enemy.x += ex * enemy.speed;
            enemy.y += ey * enemy.speed;
        }
        // Colisão com jogador
        if (
            player.x < enemy.x + enemy.w &&
            player.x + player.w > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + player.h > enemy.y
        ) {
            player.hp -= enemy.damage * 0.02; // Dano contínuo
            playerHitFlash = 6;
            if (player.hp <= 0) {
                player.hp = 0;
                gameOver = true;
            }
        }
    }
    if (attackCooldown > 0) attackCooldown--;
    if (invincible > 0) invincible--;
    // Atualizar balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        // Remover se sair da tela
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        // Colisão com inimigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];
            let dist = Math.hypot(b.x - (enemy.x + enemy.w/2), b.y - (enemy.y + enemy.h/2));
            if (dist < enemy.w/2) {
                enemy.hp -= b.damage;
                flashEnemy(enemy);
                if (b.element) applyElementalEffect(enemy);
                bullets.splice(i, 1);
                if (enemy.hp <= 0) {
                    gainXP(enemy.isBoss ? 50 : 10);
                    if (enemy.isBoss) showBossDefeated();
                }
                break;
            }
        }
    }
    // Remover inimigos mortos
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            enemies.splice(i, 1);
        }
    }
    // Se todos inimigos morreram, próximo nível
    if (enemies.length === 0 && !gameOver) {
        level++;
        spawnEnemies();
    }
    // Aplicar efeitos elementais nos inimigos
    for (let enemy of enemies) {
        // Veneno
        if (enemy.poison && enemy.poison.time > 0) {
            enemy.hp -= enemy.poison.damage * 0.5;
            enemy.poison.time--;
        }
        // Gelo
        if (enemy.slow && enemy.slow.time > 0) {
            enemy.speed = enemy.isBoss ? 1.5 : 2 + level * 0.1;
            enemy.speed *= enemy.slow.factor;
            enemy.slow.time--;
        } else if (enemy.slow && enemy.slow.time <= 0) {
            enemy.speed = enemy.isBoss ? 1.5 : 2 + level * 0.1;
            delete enemy.slow;
        }
        // Flash visual
        if (enemy.flash && enemy.flash > 0) {
            enemy.flash--;
        }
    }
    // Feedback de hit no jogador
    if (playerHitFlash > 0) playerHitFlash--;
    // Dano do inimigo no jogador
    for (let enemy of enemies) {
        if (
            player.x < enemy.x + enemy.w &&
            player.x + player.w > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + player.h > enemy.y
        ) {
            if (invincible === 0) {
                player.hp -= enemy.damage * 0.02;
                playerHitFlash = 6;
                invincible = 40; // 40 frames de invencibilidade (~0.7s)
                // sndHit.play();
                if (player.hp <= 0) {
                    player.hp = 0;
                    gameOver = true;
                }
            }
        }
    }
    // TODO: colisão, XP, passivas, etc.
    updateCamera();
}

// DESENHAR CHÃO COM SPRITESHEET
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // NÃO chamar drawFloor, fundo será preto
    // Desenhar jogador com flash se atingido
    if (playerHitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
        ctx.restore();
    }
    // Desenhar jogador
    ctx.drawImage(images.player, player.x - camera.x, player.y - camera.y, player.w, player.h);
    // Desenhar inimigos com flash se atingidos
    for (let enemy of enemies) {
        if (enemy.flash && enemy.flash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x - camera.x, enemy.y - camera.y, enemy.w, enemy.h);
            ctx.restore();
        }
        ctx.drawImage(images[enemy.img], enemy.x - camera.x, enemy.y - camera.y, enemy.w, enemy.h);
        // Barra de vida do inimigo
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x - camera.x, enemy.y - camera.y - 8, enemy.w, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(enemy.x - camera.x, enemy.y - camera.y - 8, enemy.w * (enemy.hp/enemy.maxHp), 5);
    }
    // Desenhar balas
    ctx.fillStyle = 'yellow';
    for (let b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    // HUD do jogador
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 10, 200, 30);
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 200 * (player.hp/player.maxHp), 30);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 10, 200, 30);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('HP: ' + Math.round(player.hp), 15, 30);

    // Barra de XP
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 50, 200, 18);
    ctx.fillStyle = 'blue';
    ctx.fillRect(10, 50, 200 * (player.xp/player.xpMax), 18);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 50, 200, 18);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText('XP: ' + player.xp + ' / ' + player.xpMax, 15, 64);

    // Nível, arma e elemento
    ctx.font = '16px Arial';
    ctx.fillStyle = 'yellow';
    ctx.fillText('Nível: ' + player.level, 230, 28);
    ctx.fillStyle = 'cyan';
    ctx.fillText('Arma: ' + (player.weapon === 'sword' ? 'Espada' : 'Pistola'), 230, 48);
    ctx.fillStyle = 'orange';
    ctx.fillText('Elemento: ' + (player.element ? player.element.charAt(0).toUpperCase() + player.element.slice(1) : 'Nenhum'), 230, 68);

    // Passivas ativas
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Passivas:', 10, 90);
    for (let i = 0; i < player.passives.length; i++) {
        ctx.fillText('- ' + player.passives[i], 20, 110 + i * 18);
    }
    // Pontuação
    ctx.font = '18px Arial';
    ctx.fillStyle = 'gold';
    ctx.fillText('Pontuação: ' + score, canvas.width - 180, 30);
    // TODO: desenhar balas, XP, barra de XP, etc.
} 