// Carregar imagens
const images = {};
const imageFiles = [
    { name: 'player', src: 'player.png' },
    { name: 'enemy', src: 'enemy.png' },
    { name: 'hud', src: 'HUD.png' },
    { name: 'objetos', src: 'objetos.png' },
    { name: 'spritsheet', src: 'spritsheet.png' },
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

// Estrutura para sons (adicione arquivos .mp3 ou .wav na pasta e descomente para usar)
// const sndAttack = new Audio('attack.wav');
// const sndHit = new Audio('hit.wav');
// const sndEnemyDie = new Audio('enemy_die.wav');

let score = 0;
let invincible = 0;

function startGame() {
    // Inicializar variáveis
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: 32,
        h: 32,
        speed: 3,
        maxSpeed: 3,
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

function spawnEnemies() {
    // Spawna inimigos normais ou chefe
    const num = (level % bossLevel === 0) ? 1 : Math.min(3 + level, 10);
    for (let i = 0; i < num; i++) {
        let isBoss = (level % bossLevel === 0);
        // Spawn nas bordas
        let edge = Math.floor(Math.random() * 4);
        let x, y;
        if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
        else if (edge === 1) { x = canvas.width - (isBoss ? 64 : 32); y = Math.random() * canvas.height; }
        else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
        else { x = Math.random() * canvas.width; y = canvas.height - (isBoss ? 64 : 32); }
        enemies.push({
            x, y,
            w: isBoss ? 64 : 32,
            h: isBoss ? 64 : 32,
            hp: isBoss ? 100 + level * 20 : 20 + level * 5,
            maxHp: isBoss ? 100 + level * 20 : 20 + level * 5,
            speed: isBoss ? 1.5 : 2 + level * 0.1,
            damage: isBoss ? 20 : 5 + level,
            isBoss,
        });
    }
}

// Controle de teclas
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
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
        if (dist < 50) {
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

function update() {
    // Movimentação em 8 direções
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
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
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Desenhar jogador com flash se atingido
    if (playerHitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.restore();
    }
    // Desenhar jogador
    ctx.drawImage(images.player, player.x, player.y, player.w, player.h);
    // Desenhar inimigos com flash se atingidos
    for (let enemy of enemies) {
        if (enemy.flash && enemy.flash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
            ctx.restore();
        }
        ctx.drawImage(images.enemy, enemy.x, enemy.y, enemy.w, enemy.h);
        // Barra de vida do inimigo
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.w, 5);
        ctx.fillStyle = 'lime';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.w * (enemy.hp/enemy.maxHp), 5);
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