package app.lovable.aee8513a20b74d2fbcfc37771c3f9639;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.ProxyInfo;
import android.os.Bundle;
import android.util.Log;
import androidx.webkit.ProxyConfig;
import androidx.webkit.ProxyController;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "CMMSProxy";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyNetworkProxy();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyNetworkProxy();
    }

    /**
     * Android only hands the Ethernet proxy to the browser, not to other apps.
     * Read the proxy configured on the active network and force it into the WebView.
     */
    private void applyNetworkProxy() {
        try {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) return;
            String host = null;
            int port = -1;

            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                ProxyInfo info = cm.getDefaultProxy();
                if (info == null || info.getHost() == null) {
                    Network net = cm.getActiveNetwork();
                    LinkProperties lp = net != null ? cm.getLinkProperties(net) : null;
                    if (lp != null) info = lp.getHttpProxy();
                }
                if (info != null && info.getHost() != null && !info.getHost().isEmpty()) {
                    host = info.getHost();
                    port = info.getPort();
                }
            }
            if (host == null) {
                host = System.getProperty("http.proxyHost");
                String p = System.getProperty("http.proxyPort");
                if (p != null) try { port = Integer.parseInt(p); } catch (NumberFormatException ignored) {}
            }

            Runnable done = () -> Log.i(TAG, "Proxy applied");
            if (host == null || host.isEmpty() || port <= 0) {
                ProxyController.getInstance().clearProxyOverride(Runnable::run, done);
                return;
            }
            ProxyConfig config = new ProxyConfig.Builder()
                .addProxyRule(host + ":" + port)
                .addDirect()
                .build();
            ProxyController.getInstance().setProxyOverride(config, Runnable::run, done);
            Log.i(TAG, "Using proxy " + host + ":" + port);
        } catch (Exception e) {
            Log.w(TAG, "Could not apply proxy", e);
        }
    }
}
