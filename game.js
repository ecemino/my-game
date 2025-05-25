var canvas = document.querySelector('canvas');
var c = canvas.getContext('2d');

const TILE_LEN = 128;
const MAP_ROWS = 6;
const MAP_COLS = 6;

canvas.width = TILE_LEN * MAP_COLS;
canvas.height = TILE_LEN * MAP_ROWS;

let level = 1; //calistirilmasi gereken seviyeyi belirtir
let lastGeneratedLevel =1; //en son ekrana cizilen seviyeyi belirtir

var karsilama = true;

document.addEventListener('keydown', (a) =>{
  if (a.key === 'Enter' && karsilama) {
    karsilama = false;
  }
});

const bgMusic = new Audio('audio/bg_music.mp3'); //arkaplan muzigi
bgMusic.loop = true;
bgMusic.volume = 1;
bgMusic.play().catch(e => {});

const moveSound = new Audio('audio/move.mp3');
moveSound.volume = 0.65;

var playerImg = new Image();
var npcImg = new Image();
var grassImg = new Image();
var bgImg = new Image();

var entity1_img = new Image();
var entity2_up_img = new Image();
var entity2_down_img = new Image();
var entity3_unlit_img = new Image();
var entity3_lit_img = new Image();

playerImg.src = "images/player.png";
npcImg.src = "images/npc.png";
grassImg.src = "images/grass.png";
bgImg.src = "images/bg.png";
entity1_img.src = "images/entity1.png";
entity2_up_img.src = "images/entity2_up.png";
entity2_down_img.src = "images/entity2_down.png";
entity3_unlit_img.src = "images/entity3_unlit.png";
entity3_lit_img.src = "images/entity3_lit.png";

let mapTileSet = []; //haritanin her karosu icin karo indeksi ve bosluk/zemin bilgisini tutar

let runnable = true; //oyun devam edebilip edemeyecegini gosterir (mesela npc hareketsiz kalirsa false)

const player = { //oyuncu haritanin sol ust kosesinde baslar
  tileX: 0,
  tileY: 0,
  canmove: true
};

const npc = { //npc haritanin sag alt kosesinde baslar
  tileX: 5,
  tileY: 5,
  targetIndex: 0, //npc harekete gectigi zaman bir sonraki adimini belirten path dizisi elementinin indexini ifade eder
  canmove: false,
};

let path = [{tileX: player.tileX, tileY: player.tileY}]; // oyuncunun npc'ye ulasana kadar attigi her adim buraya kaydedilir. Npc geri takip etmek icin bu diziyi kullanir

var directions = []; //npc icin hareket yonunu kaydeder. 1: yukari
                     //npc'nin hareket yonu              2: sola
                     //player'ın tersidir                3: asagi
                     //                                  4: saga

let entities =[
  {tileX: 2, tileY: 3, type: 1}, //1: ittirilebilir blok

];


const keys = {};
document.addEventListener('keydown', a => keys[a.key.toLowerCase()] = true);
document.addEventListener('keyup', a => keys[a.key.toLowerCase()] = false);

//her karo satir bazli olarak numaralandirilir
let voidTiles = [2,3,4,5,9,10,11,12,13,15,16,17,18,22,23,24,25,28,29,30,31,32];  //voidTiles bosluk olan ve her iki karakterin de ustunde yuruyemecegi bloklari tutar
customMap(voidTiles); //bosluk karolarini alarak haritayi cizmek icin kullanilacak veri setini doldurur


document.addEventListener('keydown', ()=>{ //arka plan muzigi ilk klavye girisinde calmaya baslar
  bgMusic.play();
}, {once:true});

document.addEventListener('keydown', a => { //oyuncu hareketi
  
  if(!player.canmove) return; //oyuncu hareketine izin yoksa klavye dinlemeyi kes | NOT: oyuncu npc'ye ulastiktan sonra hareketi engellenir

  player.canmove = false; // buraya geldiyse oyuncunun hareket etme yetkisi var. 
                          //oyuncu hareketi tamamlanana kadar baska klavye girdisi alinirsa listener calisip sorun cikarmasin diye
                          // gecici olarak hareket yetkisi kaldirilir

    let newTileX = player.tileX;
    let newTileY = player.tileY;

    var dir; //npc'nin hareket yonu dizisine (directions) kaydedilecek degeri tutan icin gecici degisken

    switch(a.key.toLowerCase()){
      case 'w':
      case 'arrowup':

        var destNum = (newTileY-1) * MAP_COLS + newTileX; //karoya yurunemiyorsa adim attirmaz
        if(voidTiles.includes(destNum)) break;

        newTileY--;
        dir=3; //geri takip ederken npc asagi(3) gidecek

        moveSound.currentTime = 0; //her adimda ses oynatir
        moveSound.play();
        break;

      case 'a':
      case 'arrowleft':

        var destNum = newTileY * MAP_COLS + newTileX -1; //karoya yurunemiyorsa adim attirmaz
        if(voidTiles.includes(destNum)) break;

        newTileX--;
        dir=4; //geri takip ederken npc saga(4) gidecek

        moveSound.currentTime = 0;//her adimda ses oynatir
        moveSound.play();
        break;
      
      case 's':
      case 'arrowdown':

        var destNum = (newTileY+1) * MAP_COLS + newTileX; //karoya yurunemiyorsa adim attirmaz
        if(voidTiles.includes(destNum)) break;

        newTileY++;
        dir=1; //geri takip ederken npc yukari(1) gidecek

        moveSound.currentTime = 0;
        moveSound.play();//her adimda ses oynatir
        break;
      
      case 'd':
      case 'arrowright':

        var destNum = newTileY * MAP_COLS + newTileX +1; 
        if(voidTiles.includes(destNum)) break; //karoya yurunemiyorsa konum guncellemeden switch'i kirar

        newTileX++;
        dir=2; //geri takip ederken npc sola(2) gidecek

        moveSound.currentTime = 0;
        moveSound.play();//her adimda ses oynatir
        break;
    }

    if(dir != undefined) directions.push(dir); //dir olmasi gerektigi gibi guncellenmisse yonu diziye kaydet
    
    //npc.targetIndex = path.length - 1; 
    player.canmove = true; //listener'in basinda gecici olarak kaldirilan hareket yetkisi geri tanimlanir

    if(newTileX >= 0 && newTileY >= 0 && newTileX < MAP_COLS && newTileY < MAP_ROWS){ //istenen adim harita sinirlari icinde mi?
            
      if(player.tileX != newTileX || player.tileY != newTileY){ //eski konum ile yeni konum farkliysa calisir
        path.push({tileX: newTileX, tileY: newTileY});          //boylece ayni konumun birden fazla arka arkaya path'e kaydedilmesi engellenirw
        player.tileX = newTileX;
        player.tileY = newTileY;
      }

      if(player.tileX == npc.tileX && player.tileY == npc.tileY){ //player npc'ye ulasti

        npc.targetIndex = path.length -1; //oyuncu npc'ye ulastigi icin npc'nin hedef adim indeksi path dizisinin sonundan baslar. azalarak adimlari tersten takip edecektir

        npc.canmove = true;
        player.canmove = false; //artik npc hareket ederken oyuncu bekler 

        player.tileX = 0;
        player.tileY = 0; //oyuncu baslangic konumuna geri doner

        (async () => { //updateNPC async oldugu icin onun Promise nesnesi degil boolean deger gondermesini bekler
          
          runnable = (await updateNPC()); //NPC rotayi sorunsuz tamamlarsa true, takili kalirsa false
          if(!runnable)alert("Nox takılı kaldı! Tekrar dene.");
        })();      
      }
    }
  
})

function move(entity, dest){ //istenen varligin koordinatlarini istenen konuma gunceller
  entity.tileX = dest.tileX;
  entity.tileY = dest.tileY;
}

function delay(ms){ //duraklama fonksiyonu
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateNPC(){ //npc hareketini yonetir. npcnin cok hizli hareket etmesini engellemek icin delay fonksiyonunu kullanir bu sebeple async'tir
                            //boolean deger dondurerek oyunun calismaya devam edip edemeyecegini belirtir

  while (npc.canmove && path.length > 0 && npc.targetIndex >= 0){ //rota dolu oldugu ve npc tarafindan bastan sona adimlanmadigi surece doner
    const destination = path[npc.targetIndex]; //hedef konumu rota dizisinden alir
        
    for(const en of entities){ 

      if(en.tileX == destination.tileX && en.tileY == destination.tileY){ //npc bir varlik(entity) ile karsilasti mi? karsilastiyse updateNPc false dondurur

        switch(en.type){
          case 1: //heykelle karsilasir
            var blockTo;
            
              switch(directions[npc.targetIndex]){//hareket yonunu tespit eder
                
                case 1: //heykeli yukari iter
                  blockTo = (destination.tileY -1) * MAP_COLS + destination.tileX; //heykelin ittirilmesi planlanan karonun numarasi hesaplanir

                  if(voidTiles.includes(blockTo)) return false; //heykeli bos karoya ittiremez, rotaya devam edemez ve updateNPC'den false dondurur
                  
                  move(en, {tileX: en.tileX, tileY: en.tileY - 1}); //heykeli hedefelenen konuma ittir
                  break;
                
                case 2: //heykeli sola iter
                  blockTo = destination.tileY * MAP_COLS + destination.tileX -1; //heykelin ittirilmesi planlanan karo

                  if(voidTiles.includes(blockTo)) return false; //heykeli bos karoya ittiremez, rotaya devam edemez ve updateNPC'den false dondurur

                  move(en, {tileX: en.tileX -1, tileY: en.tileY});
                  break;
                
                case 3: //blogu asagi iter
                  blockTo =(destination.tileY + 1) * MAP_COLS + destination.tileX; //heykelin ittirilmesi planlanan karo

                  if(voidTiles.includes(blockTo)) return false; //heykeli bos karoya ittiremez, rotaya devam edemez ve updateNPC'den false dondurur

                  move(en, {tileX: en.tileX, tileY: en.tileY + 1});
                  break;
                
                case 4: // blogu saga iter
                  blockTo = destination.tileY * MAP_COLS + destination.tileX + 1; //heykelin ittirilmesi planlanan karo

                  if(voidTiles.includes(blockTo)) return false; //heykeli bos karoya ittiremez, rotaya devam edemez ve updateNPC'den false dondurur

                  move(en, {tileX: en.tileX +1, tileY: en.tileY});
                  break;
              }
              break;

          case 2: //sasrmasikla karsilasti

            if(!en.down)return false;// kristale basilmamis npc devam edemez > seviye basarisiz

            break; //if calismazsa switchi kirar ve npc konumu guncellenir
            
          case 3: //kristalle karsilasir ustune basar
            en.pressed = true;
            break;

        }
        
      }
    }

    if(entities[entities.length -1].type == 3 && entities[entities.length -1].pressed) //kristal hep dizinin sonunda ve sarmasik ondan 1 once tanimlanir
      entities[entities.length -2].down = true; //kristele basilmissa sarmasik gecilebilir

    move(npc, destination); //adimla
    npc.targetIndex--;

    await delay(300);
  }

  level++; // sonraki seviyeye gecilecek
  return true; //sorun yok konum guncellendi
}

function drawTile(x, y, color) {
  c.fillStyle = color;
  c.fillRect(x * TILE_LEN, y * TILE_LEN, TILE_LEN, TILE_LEN);
}

function drawGrass(tileX, tileY){
  c.drawImage(grassImg, tileX * TILE_LEN,tileY * TILE_LEN);
}

function drawMap(){ 

  for(const tile of mapTileSet) //her karonun koordinati ve bosluk olup olmadigini saklayan nesne dizisi
    tile.isBlocked ? drawTile(tile.tileX, tile.tileY,'rgba(153, 217,234,0)') :drawGrass(tile.tileX,tile.tileY);
  
}

function customMap(invalidTiles){ //o seviyenin gecerli ve gecersiz (bosluk) bloklari icin veri seti olusturur 
  for(let y = 0; y < MAP_ROWS; y++){
    for( let x = 0; x < MAP_COLS; x++){

      const tileNumber = y * MAP_COLS + x; //karo numarasi hesaplanir

      const isVoid = invalidTiles.includes(tileNumber); //karo bosluk mu?

      mapTileSet.push({tileX:x , tileY: y, isBlocked: isVoid});
    }
  }
}

function drawEntity(enArray){ //alinan varlik dizisini haritaya yerlestirir

  for(const en of enArray){
    switch(en.type){
      case 1: //heykel cizimi
        c.drawImage(entity1_img, en.tileX * TILE_LEN, en.tileY * TILE_LEN, TILE_LEN, TILE_LEN); 
        break;

      case 2: //sarmasik cizimi
        c.drawImage(en.down? entity2_down_img:entity2_up_img, en.tileX * TILE_LEN, en.tileY * TILE_LEN, TILE_LEN, TILE_LEN); 
        break;

      case 3: //kristal cizimi
        c.drawImage(en.pressed? entity3_lit_img:entity3_unlit_img, en.tileX * TILE_LEN, en.tileY * TILE_LEN, TILE_LEN, TILE_LEN); 
        

    }
  }
}


function drawPlayer(){ 
  c.drawImage(playerImg, player.tileX * TILE_LEN, player.tileY * TILE_LEN); 
}

function drawNPC(){
  c.drawImage(npcImg, npc.tileX * TILE_LEN, npc.tileY * TILE_LEN); 
}


async function gameLoop(){

  if (karsilama) {//karsilama ekrani

    c.drawImage(bgImg, 0,0,canvas.width,canvas.height);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0,0, canvas.width, canvas.height);

    c.fillStyle = "white";
    c.font = "30px Arial";
    c.textAlign = "center";
    c.strokeStyle = 'rgb(255, 110, 110)';
    c.lineWidth = 3;
    c.strokeText("DUX-NOX",canvas.width / 2, TILE_LEN);
    c.fillText("DUX-NOX", canvas.width / 2, TILE_LEN);
    

    const text = `Siyah kedi Nox göremiyor ve beyaz kedi Dux'a ulaşmak istiyor!
Nox'un atacağı adımları göstermesi için Dux'a yardım et!

— WASD veya yön tuşlarıyla Dux'ı kontrol et.
— Dux ile attığın adımlar Nox tarafından sondan başlayarak tekrar edilir.
— Dux her engelin üzerinden adımlayabilir fakat Nox bunu yapamaz, bu engelleri
ittirebilmesi ya da kristali aydınlatarak ortadan kaldırabilmesi için uygun adım haritasını çizmelisin.
— Nox haritadaki kristalin üstüne basarak kristali aydınlatabilir.
    — Kristal aydınlandığında sarmaşıklar geri çekilir ve Nox'un geçmesine izin verir.
— Nox yeşil heykelleri harita içinde ittirebilir.`;

    const textStartPosY =2.25 * TILE_LEN;
    const lines = text.split('\n');
    
        c.textAlign = "center";
    //c.textBaseline = "top";
    c.strokeStyle = "black";
    c.lineWidth = 3;
    c.font = "18px Cambria";

    c.fillStyle = 'white';

    lines.forEach((line, i)=>{
      const y = textStartPosY + i*26; //her satir icin 26 px yer atar
      c.strokeText(line, canvas.width / 2, y);
      c.fillText(line, canvas.width / 2, y);
    });

    c.fillText("Başlamak için Enter'a bas.", canvas.width/2, TILE_LEN*5 );

    requestAnimationFrame(gameLoop);
    return;
  }

  if(!runnable){ // oyun cikmaza girmisse ayni seviyeyi resetle

    player.tileX = 0;
    player.tileY = 0;
    player.canmove = true;
    
    npc.tileX = 5;
    npc.tileY = 5;
    npc.targetIndex = 0;
    npc.canmove = false; // oyuncu ve npc konumlari sifirlandi
    
    switch(level){

      case 1: //haritayi seviye 1 icin hazirlar
        entities =[
          {tileX: 2, tileY: 3, type: 1} //heykel konumu
        ];
        break;
      
      case 2: //haritayi seviye 2 icin hazirlar
        entities = [
          {tileX: 2,tileY: 4, type: 2, down: false}, //sarmasik konumu
          {tileX: 5, tileY:3, type: 3, pressed: false} // kristal konumu
        ];

        voidTiles.length = 0;
        voidTiles.push(...[2,3,4,5,8,9,10,11,14,15,16,17,18,20,24,30,31]); //bosluk karolari
        break;
      
      case 3://haritayi seviye 3 icin hazirlar
        entities = [
          {tileX: 5,tileY: 3, type: 1}, // heykel konumu
          {tileX: 1, tileY:2, type: 2, down: false}, //sarmasik konumu
          {tileX: 3, tileY: 0, type: 3, pressed: false} // kristal konumu
        ];

        voidTiles.length = 0;
        voidTiles.push(...[1,2,4,5,7,8,10,16,18,19,24,25,26,28,30,31,32,34]); //bosluk karolari hazir veriseti
        
        break;
      
      case 4: //haritayi seviye 4 icin hazirlar
        entities = [
          {tileX: 4, tileY: 3, type: 1}, //heykel konumu 
          {tileX: 2, tileY:1, type: 2, down: false}, //sarmasik konumu
          {tileX: 2, tileY: 5, type: 3, pressed: false} // kristal konumu
        ];
        
        
        voidTiles.length = 0; 
        voidTiles.push(...[3,4,5,11,12,13,14,15,17,25,26,27,29]); //bosluk karolari hazir veriseti
        break;
    }
    path = []; //rota sifirlanir
    directions = []; //hareket yonları sifirlanir

    path.push({tileX: player.tileX, tileY: player.tileY}); //oyuncunun ilk konumu rotaya eklenir
    runnable = true;
    await delay(1000);
  }

  c.clearRect(0,0,canvas.width, canvas.height);

  if(lastGeneratedLevel!= level){ // eger guncel seviyenin kurulumu daha yapilmamissa haritayi hazirlar
  
      player.tileX = 0;
      player.tileY = 0;
      player.canmove = true;
        
      npc.tileX = 5;
      npc.tileY = 5;
      npc.targetIndex = 0; //oyuncu ve npc resetlendi

      mapTileSet = []; //harita veri seti yenilenmek uzere sifirlanir

      path = []; // rota ve yon veri setleri yeni seviye icin bosaltilir
      directions = [];
  
    switch(level){
      //1. seviye haritasi oyun basinda hazirlandigi icin onun case'i bulunmaz

      case 2: //seviye 2 icin harita hazirlanir
        
        entities = [
          {tileX: 2,tileY: 4, type: 2, down: false}, //sarmasik
          {tileX: 5, tileY:3, type: 3, pressed: false} //kristal
        ];
       
        path.push({tileX: player.tileX, tileY: player.tileY});

        voidTiles.length = 0;
        voidTiles.push(...[2,3,4,5,8,9,10,11,14,15,16,17,18,20,21,22,24,27,30,31]);

        customMap(voidTiles);
        break;

      case 3: //seviye 3 icin harita hazirlanir

        entities = [
          {tileX: 5,tileY: 3, type: 1}, //heykel
          {tileX: 1, tileY:2, type: 2, down: false}, //sarmasik
          {tileX: 3, tileY: 0, type: 3, pressed: false} //kristal
        ];
        
        path.push({tileX: player.tileX, tileY: player.tileY}); //ilk oyuncu konumu rotaya kaydedilir
        
        voidTiles.length = 0;
        voidTiles.push(...[1,2,4,5,7,8,10,16,18,19,24,25,26,27,28,30,31,32,33,34]); //yurunemez bloklar hazir veriseti

        customMap(voidTiles); //yurunmez bloklara gore harita veri seti doldurulur
        break;
      
      case 4: //seviye 4 icin harita hazirlanir
        entities = [
          {tileX: 4, tileY: 3, type: 1}, //heykel konumu 
          {tileX: 2, tileY:1, type: 2, down: false}, //sarmasik konumu
          {tileX: 2, tileY: 5, type: 3, pressed: false} // kristal konumu
        ];
        
       
        path.push({tileX: player.tileX, tileY: player.tileY}); //ilk oyuncu konumu rotaya kaydedilir
        
        voidTiles.length = 0; 
        voidTiles.push(...[3,4,5,11,12,13,14,15,17,25,26,27,29]); //yurunemez bloklar hazir veriseti

        customMap(voidTiles); //yurunmez bloklara gore harita veri seti doldurulur
        break;

    }

    lastGeneratedLevel = level; //harita seviyeye uygun olarak guncellendigi icin son cizilen seviye degiskeni guncellenir 
  }

  if(level != 5){ //4. seviye tamamlanmissa oyun biter
  
    c.drawImage(bgImg,0,0,canvas.width, canvas.height);
    
    drawMap();
    drawEntity(entities);
    drawPlayer();
    drawNPC();

    requestAnimationFrame(gameLoop);
}else{
  c.drawImage(bgImg,0,0,canvas.width, canvas.height);
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0,0, canvas.width, canvas.height);

  c.fillStyle = "white";
  c.font = "30px Arial";
  c.textAlign = "center";
  c.strokeStyle = 'rgb(189, 155, 229)';
  c.lineWidth = 3;
  c.strokeText("Tebrikler, oyunu bitirdiniz!",canvas.width / 2, TILE_LEN * 3);
  c.fillText("Tebrikler, oyunu bitirdiniz!", canvas.width / 2, TILE_LEN * 3);

}
}

gameLoop();
