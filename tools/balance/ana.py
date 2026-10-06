import re,sys,math,collections
CP={}
REC_BASE=float(sys.argv[2]) if len(sys.argv)>2 else 700
G=1.45
TH={'casual':1,'easy':math.sqrt(1.3*1.2),'normal':math.sqrt(1.8*1.5)*1.08,'hard':math.sqrt(2.5*1.9)*1.08,'hell':math.sqrt(3.5*2.5)*1.16,'nightmare':math.sqrt(5*3.3)*1.24}
rows=[]
for l in open(sys.argv[1]):
    m=re.match(r'(\w+) power \{"p":(\d+)',l)
    if m: CP[m.group(1)]=int(m.group(2)); continue
    m=re.match(r'(\w+) (\w+)\s+ch(\d+) (\S+)\s+win (\d+)/(\d+)',l)
    if m: rows.append((m.group(1),m.group(2),int(m.group(3)),m.group(4),int(m.group(5)),int(m.group(6))))
bins=collections.defaultdict(lambda:[0,0])
for pf,d,ch,h,w,n in rows:
    rec=REC_BASE*TH[d]*G**(ch-1)
    r=CP[pf]/rec
    b=round(math.log(r,1.25))
    bins[b][0]+=w; bins[b][1]+=n
for b in sorted(bins):
    w,n=bins[b]; print(f'ratio ~{1.25**b:5.2f}  win {w}/{n} = {w/n*100:4.0f}%')
# per difficulty: ratio at which ~70%
