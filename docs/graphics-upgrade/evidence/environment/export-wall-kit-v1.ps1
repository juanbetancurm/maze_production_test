param([switch]$Refined)
# Evidence-only export/proof script. Generates no game code or manifest changes.
# Original artwork was generated with the built-in imagegen tool. This script
# crops/resamples exports and arranges exact repeats for review; no repainting.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
public static class WallKitEvidence {
  static bool composed=false;
  static void Quality(Graphics g) {
    g.InterpolationMode=InterpolationMode.HighQualityBicubic;
    g.PixelOffsetMode=PixelOffsetMode.HighQuality;
    g.SmoothingMode=SmoothingMode.AntiAlias;
    g.CompositingQuality=CompositingQuality.HighQuality;
  }
  static void SaveNew(Bitmap b,string path) {
    if(File.Exists(path)) throw new InvalidOperationException("Refusing to overwrite "+path);
    b.Save(path,ImageFormat.Png);
  }
  static Bitmap Export(string source,Rectangle crop,int w,int h) {
    var output=new Bitmap(w,h,PixelFormat.Format32bppArgb);
    using(var input=new Bitmap(source)) using(var g=Graphics.FromImage(output)) using(var ia=new ImageAttributes()) {
      Quality(g);g.Clear(Color.Transparent);g.CompositingMode=CompositingMode.SourceCopy;
      ia.SetWrapMode(WrapMode.TileFlipXY);
      g.DrawImage(input,new Rectangle(0,0,w,h),crop.X,crop.Y,crop.Width,crop.Height,GraphicsUnit.Pixel,ia);
    }
    return output;
  }
  public static void ExportAll(string src,string assets) {
    using(var b=Export(Path.Combine(src,"wall-strip-v1-generation.png"),new Rectangle(0,254,2172,213),128,32)) SaveNew(b,Path.Combine(assets,"wall-strip-v1.png"));
    using(var b=Export(Path.Combine(src,"wall-cap-v1-generation.png"),new Rectangle(455,300,654,653),32,32)) {
      SaveNew(b,Path.Combine(assets,"wall-cap-end-v1.png"));
      b.RotateFlip(RotateFlipType.Rotate180FlipNone);
      SaveNew(b,Path.Combine(assets,"wall-cap-start-v1.png"));
    }
    using(var b=Export(Path.Combine(src,"wall-join-v1-generation.png"),new Rectangle(12,25,1228,1228),32,32)) SaveNew(b,Path.Combine(assets,"wall-join-v1.png"));
  }
  public static void ExportRefined(string src,string assets) {
    // Uniform 4:1 crop, chosen by inspecting edge error; no seam blending.
    using(var b=Export(Path.Combine(src,"wall-strip-v1-generation.png"),new Rectangle(1062,254,852,213),128,32)) SaveNew(b,Path.Combine(assets,"wall-strip-v2.png"));
  }
  public static void Repeat(string assets,string evidence,bool refined) {
    string version=refined?"v2":"v1";
    using(var strip=new Bitmap(Path.Combine(assets,"wall-strip-"+version+".png"))) using(var proof=new Bitmap(384,96,PixelFormat.Format32bppArgb)) {
      using(var g=Graphics.FromImage(proof)){g.Clear(Color.Transparent);g.CompositingMode=CompositingMode.SourceCopy;for(int y=0;y<3;y++)for(int x=0;x<3;x++)g.DrawImageUnscaled(strip,x*128,y*32);}
      SaveNew(proof,Path.Combine(evidence,"wall-strip-"+version+"-repeat-3x3.png"));
    }
  }
  static void Segment(Graphics g,Bitmap strip,Bitmap start,Bitmap end,float x1,float y1,float x2,float y2) {
    float dx=x2-x1,dy=y2-y1,len=(float)Math.Sqrt(dx*dx+dy*dy);
    var state=g.Save();g.TranslateTransform(x1,y1);g.RotateTransform((float)(Math.Atan2(dy,dx)*180/Math.PI));
    if(composed) {
      // Compose at source resolution before rotation: avoid per-piece filtering gaps.
      int pixels=(int)Math.Ceiling(len*2);
      using(var local=new Bitmap(pixels,32,PixelFormat.Format32bppArgb)) {
        using(var lg=Graphics.FromImage(local)) {
          lg.Clear(Color.Transparent);lg.CompositingMode=CompositingMode.SourceCopy;
          lg.SetClip(new Rectangle(16,0,Math.Max(0,pixels-32),32));
          for(int x=16;x<pixels-16;x+=128) lg.DrawImageUnscaled(strip,x,0);
          lg.ResetClip();lg.CompositingMode=CompositingMode.SourceOver;
          lg.DrawImageUnscaled(start,0,0);lg.DrawImageUnscaled(end,pixels-32,0);
        }
        using(var ia=new ImageAttributes()) {
          ia.SetWrapMode(WrapMode.TileFlipXY);
          g.DrawImage(local,new PointF[]{new PointF(0,-8),new PointF(len,-8),new PointF(0,8)},new RectangleF(0,0,pixels,32),GraphicsUnit.Pixel,ia);
        }
      }
      g.Restore(state);return;
    }
    // Proof composition only: 0.5 scale, 64-unit repeat, final tile cropped.
    for(float x=8;x<len-8;x+=64){float n=Math.Min(64,len-8-x);g.DrawImage(strip,new RectangleF(x,-8,n,16),new RectangleF(0,0,n*2,32),GraphicsUnit.Pixel);}
    g.DrawImage(start,new RectangleF(0,-8,16,16));g.DrawImage(end,new RectangleF(len-16,-8,16,16));g.Restore(state);
  }
  static void Join(Graphics g,Bitmap join,float x,float y) {g.DrawImage(join,new RectangleF(x-8,y-8,16,16));}
  public static void Geometry(string assets,string evidence,bool refined) {
    composed=refined;string version=refined?"v2-composed":"v1";
    using(var grass=new Bitmap(Path.Combine(assets,"grass-quiet-v2.png")))
    using(var strip=new Bitmap(Path.Combine(assets,refined?"wall-strip-v2.png":"wall-strip-v1.png")))
    using(var start=new Bitmap(Path.Combine(assets,"wall-cap-start-v1.png")))
    using(var end=new Bitmap(Path.Combine(assets,"wall-cap-end-v1.png")))
    using(var join=new Bitmap(Path.Combine(assets,"wall-join-v1.png")))
    using(var proof=new Bitmap(800,600,PixelFormat.Format24bppRgb)) {
      using(var g=Graphics.FromImage(proof)) {
        Quality(g);for(int y=0;y<600;y+=512)for(int x=0;x<800;x+=512)g.DrawImageUnscaled(grass,x,y);
        Segment(g,strip,start,end,40,70,350,70);
        Segment(g,strip,start,end,395,50,395,235);
        Segment(g,strip,start,end,450,70,690,70);Segment(g,strip,start,end,690,70,690,230);Join(g,join,690,70);
        Segment(g,strip,start,end,40,265,325,165);
        Segment(g,strip,start,end,40,330,325,440);
        Segment(g,strip,start,end,350,335,600,335);Segment(g,strip,start,end,450,255,450,335);Join(g,join,450,335);
        // Actual L2 acute fork translated (-40,+120): (160,320)->(100,450)/(200,450).
        Segment(g,strip,start,end,120,440,60,570);Segment(g,strip,start,end,120,440,160,570);Join(g,join,120,440);
        Segment(g,strip,start,end,390,535,500,425);Segment(g,strip,start,end,500,425,690,535);Join(g,join,500,425);
      }
      SaveNew(proof,Path.Combine(evidence,"wall-kit-"+version+"-joins-native.png"));
      using(var enlarged=new Bitmap(1600,1200,PixelFormat.Format24bppRgb)) {
        using(var g=Graphics.FromImage(enlarged)){g.InterpolationMode=InterpolationMode.NearestNeighbor;g.PixelOffsetMode=PixelOffsetMode.Half;g.DrawImage(proof,new Rectangle(0,0,1600,1200));}
        SaveNew(enlarged,Path.Combine(evidence,"wall-kit-"+version+"-joins-2x.png"));
      }
    }
  }
  public static void AlphaProof(string assets,string evidence) {
    string[] names={"wall-strip-v1.png","wall-cap-start-v1.png","wall-cap-end-v1.png","wall-join-v1.png"};
    using(var proof=new Bitmap(576,160,PixelFormat.Format24bppRgb)) {
      using(var g=Graphics.FromImage(proof)) {
        Quality(g);g.Clear(Color.FromArgb(20,32,41));g.FillRectangle(Brushes.White,0,80,576,80);
        for(int row=0;row<2;row++) {
          using(var strip=new Bitmap(Path.Combine(assets,names[0]))) g.DrawImage(strip,new Rectangle(16,row*80+24,256,32));
          for(int i=1;i<names.Length;i++)using(var b=new Bitmap(Path.Combine(assets,names[i]))) g.DrawImage(b,new Rectangle(304+(i-1)*80,row*80+8,64,64));
        }
      }
      SaveNew(proof,Path.Combine(evidence,"wall-kit-v1-alpha-proof.png"));
    }
  }
  public static string Metrics(string path) {
    using(var b=new Bitmap(path)) {
      double diff=0,neighbor=0,alphaDiff=0;int max=0;int amin=255,amax=0,zero=0;double opacity=0;
      for(int y=0;y<b.Height;y++) {
        var l=b.GetPixel(0,y);var r=b.GetPixel(b.Width-1,y);var n=b.GetPixel(1,y);
        foreach(int d in new[]{Math.Abs(l.R-r.R),Math.Abs(l.G-r.G),Math.Abs(l.B-r.B)}){diff+=d;max=Math.Max(max,d);}
        neighbor+=Math.Abs(l.R-n.R)+Math.Abs(l.G-n.G)+Math.Abs(l.B-n.B);alphaDiff+=Math.Abs(l.A-r.A);
      }
      for(int y=0;y<b.Height;y++)for(int x=0;x<b.Width;x++){int a=b.GetPixel(x,y).A;amin=Math.Min(amin,a);amax=Math.Max(amax,a);if(a==0)zero++;opacity+=a;}
      return Path.GetFileName(path)+" "+b.Width+"x"+b.Height+" alpha="+amin+".."+amax+" zeroAlpha="+zero+" meanAlpha="+(opacity/(b.Width*b.Height)).ToString("F3")+" edgeRGB_MAE="+(diff/(b.Height*3)).ToString("F6")+" neighborRGB_MAE="+(neighbor/(b.Height*3)).ToString("F6")+" edgeRGBmax="+max+" edgeAlpha_MAE="+(alphaDiff/b.Height).ToString("F6");
    }
  }
}
'@
$taskEvidence = $PSScriptRoot
$taskRepo = (Resolve-Path -LiteralPath (Join-Path $taskEvidence '../../../..')).Path
$taskAssets = Join-Path $taskRepo 'frontend/public/assets/premium/environment'
if ($Refined) {
  [WallKitEvidence]::ExportRefined($taskEvidence,$taskAssets)
  [WallKitEvidence]::Repeat($taskAssets,$taskEvidence,$true)
  [WallKitEvidence]::Geometry($taskAssets,$taskEvidence,$true)
} else {
  [WallKitEvidence]::ExportAll($taskEvidence,$taskAssets)
  [WallKitEvidence]::Repeat($taskAssets,$taskEvidence,$false)
  [WallKitEvidence]::Geometry($taskAssets,$taskEvidence,$false)
  [WallKitEvidence]::AlphaProof($taskAssets,$taskEvidence)
}
Get-ChildItem -LiteralPath $taskAssets -Filter 'wall-*.png' | ForEach-Object { [WallKitEvidence]::Metrics($_.FullName) }
