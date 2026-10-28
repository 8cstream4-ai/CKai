import android.app.UiAutomation;
import android.graphics.Rect;
import android.os.Looper;
import android.view.accessibility.AccessibilityNodeInfo;
import java.io.File;
import java.lang.reflect.Method;

/** Test-only accessibility snapshot without waiting for an animated screen to become idle. */
public final class CKaiDump {
  public static void main(String[] args) throws Exception {
    Looper.prepare();
    Class<?> type=Class.forName("com.android.uiautomator.core.UiAutomationShellWrapper");
    Object shell=type.getConstructor().newInstance();
    type.getMethod("connect").invoke(shell);
    try {
      UiAutomation automation=(UiAutomation)type.getMethod("getUiAutomation").invoke(shell);
      AccessibilityNodeInfo root=null;
      for(int i=0;i<20&&root==null;i++){root=automation.getRootInActiveWindow();if(root==null)Thread.sleep(100);}
      if(root==null)throw new IllegalStateException("No active accessibility window");
      Rect bounds=new Rect();root.getBoundsInScreen(bounds);
      Class<?> dumper=Class.forName("com.android.uiautomator.core.AccessibilityNodeInfoDumper");
      Method dump=dumper.getDeclaredMethod("dumpWindowToFile",AccessibilityNodeInfo.class,File.class,int.class,int.class,int.class);
      dump.setAccessible(true);
      dump.invoke(null,root,new File(args[0]),bounds.width()>bounds.height()?1:0,bounds.right,bounds.bottom);
      System.out.println("CKai accessibility snapshot saved");
    } finally {type.getMethod("disconnect").invoke(shell);}
  }
}
