# 3.9 新地區背景
import os
from PIL import Image, ImageOps, ImageEnhance
A='/tmp/claude-0/-home-user-Auto-Battler-RPG/cfb807e2-1f1e-5d09-9e2b-c135f0bc4b56/scratchpad/assets-candidates/'
OUT='/home/user/Auto-Battler-RPG/assets/bg/'
H=150
def L(p): return Image.open(A+p).convert('RGBA')
def crop_alpha(im):
    bb=im.getchannel('A').getbbox(); return im.crop(bb) if bb else im
def fit(im,h=H,scale=None):
    if scale: return im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.NEAREST)
    return im.resize((max(1,round(im.width*h/im.height)),h),Image.NEAREST)
def stack(layers,w,h=H):
    out=Image.new('RGBA',(w,h),(0,0,0,0))
    for im in layers:
        y=h-im.height
        for x in range(0,w,im.width): out.alpha_composite(im,(x,max(0,y)))
    return out
def tint(im,rgb,amt):
    r,g,b,a=im.split(); gray=ImageOps.grayscale(im.convert('RGB'))
    col=ImageOps.colorize(gray,(0,0,0),rgb).convert('RGBA'); col.putalpha(a)
    return Image.blend(im,col,amt)
def save(name,im): im.save(OUT+name,optimize=True); print(name,im.size,os.path.getsize(OUT+name))
# 6 冰封凍原（Reemax CC0）
i='reemax-ice-planet-landscape/Ice Planet Landscape/'
fm=crop_alpha(L(i+'ice-far-mountains.png')); nf=crop_alpha(L(i+'ice-nowater-far.png')); nm=crop_alpha(L(i+'ice-nowater-mid.png'))
print('ice', fm.size, nf.size, nm.size)
sc=H*0.9/fm.height
sky=Image.new('RGBA',(320,H),(200,228,248,255))
save('snow-a.png',ImageEnhance.Brightness(tint(stack([sky,fit(fm,scale=sc),fit(nf,scale=H*0.6/nf.height)],320),(200,230,255),0.55)).enhance(1.25))
save('snow-b.png',ImageEnhance.Brightness(tint(stack([fit(nm,scale=H*0.45/nm.height)],320),(225,240,255),0.5)).enhance(1.3))
# 7 毒沼密林：高聳森林染成暗綠
f='ansimuz-sunnyland-tall-forest/Tall Forest Files/Layers/'
back,far,mid=L(f+'back.png'),L(f+'far.png'),L(f+'middle.png')
s=H/back.height
save('swamp-a.png',tint(stack([fit(back,scale=s),fit(far,scale=s)],round(far.width*s)*2),(90,160,60),0.6))
save('swamp-b.png',tint(fit(mid,scale=s),(40,90,40),0.55))
# 8 機械要塞：哥德城堡（CC0）
m='ansimuz-mountain-at-dusk/parallax_mountain_pack/layers/'
bgm=L(m+'parallax-mountain-bg.png'); farm=L(m+'parallax-mountain-montain-far.png'); mm=L(m+'parallax-mountain-mountains.png')
s=H/bgm.height
save('fort-a.png',tint(stack([fit(bgm,scale=s),fit(farm,scale=s),fit(mm,scale=s)],round(farm.width*s)*2),(150,165,200),0.75))
g='ansimuz-gothicvania-cemetery/gothicvania-cemetery-files/PNG/Environment/'
gy=L(g+'graveyard.png')
save('fort-b.png',tint(fit(gy,scale=H/L(g+'background.png').height*0.8),(110,115,135),0.7))
# 9 深淵魔域：扭曲洞窟（CC-BY 3.0 ansimuz）
w='ansimuz-warped-caves/warped-files/PNG/environment/layers/'
bg=L(w+'background.png'); mg=L(w+'middleground.png'); s=H/bg.height
save('abyss-a.png',tint(fit(bg,scale=s),(160,40,90),0.4))
save('abyss-b.png',tint(fit(mg,scale=s),(120,30,80),0.35))
# 10 星界王座：魔法懸崖染成紫色
mc='ansimuz-magic-cliffs/Magic-Cliffs-Environment/PNG/'
sk=L(mc+'sky.png'); cl=L(mc+'clouds.png'); fg=L(mc+'far-grounds.png')
s=H/sk.height
skw=fit(sk,scale=s); clw=fit(cl,scale=s*0.75)
a=Image.new('RGBA',(clw.width,H))
for x in range(0,a.width,skw.width): a.alpha_composite(skw,(x,0))
a.alpha_composite(clw,(0,H-clw.height-10))
save('astral-a.png',tint(a,(150,110,255),0.6))
save('astral-b.png',tint(fit(fg,scale=s*1.3),(110,80,200),0.55))
