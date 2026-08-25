package com.pokemon.adventure;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MultiplayerServer")
public class MultiplayerServerPlugin extends Plugin {
    private static final String TAG = "PokemonMultiplayer";
    private static final int DISCOVERY_PORT = 3002;
    private static final String DISCOVERY_REQUEST = "POKEMON_ADVENTURE_DISCOVER_V1";
    private static final String DISCOVERY_RESPONSE = "POKEMON_ADVENTURE_HOST_V1";
    private static final LocalRoomServer SERVER = new LocalRoomServer();

    @PluginMethod
    public void start(PluginCall call) {
        String playerName = call.getString("playerName", "训练师");
        String avatar = call.getString("avatar", "👦");
        String mode = call.getString("mode", "pvp");

        try {
            JSObject result = SERVER.startHost(playerName, avatar, mode);
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "start failed", error);
            call.reject("本机开房失败");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        SERVER.stop();
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(SERVER.status());
    }

    @PluginMethod
    public void request(PluginCall call) {
        final String url = call.getString("url", "");
        final String method = call.getString("method", "GET");
        final String body = call.getString("body", "");

        new Thread(() -> {
            try {
                call.resolve(requestFromDevice(url, method, body));
            } catch (Exception error) {
                Log.w(TAG, "LAN request failed", error);
                call.reject("找不到房主设备，请确认大家连着同一个 WiFi。", error);
            }
        }, "PokemonRoomClient").start();
    }

    @PluginMethod
    public void discover(PluginCall call) {
        new Thread(() -> {
            try {
                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("hosts", discoverHosts());
                call.resolve(result);
            } catch (Exception error) {
                Log.w(TAG, "LAN discovery failed", error);
                call.reject("没有找到房主设备，请确认大家连着同一个 WiFi。", error);
            }
        }, "PokemonRoomDiscovery").start();
    }

    private static JSObject requestFromDevice(String rawUrl, String method, String body) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(rawUrl).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(2500);
        connection.setReadTimeout(3000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");

        if (body != null && !body.isEmpty() && !"GET".equalsIgnoreCase(method)) {
            connection.setDoOutput(true);
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String responseBody = stream == null ? "" : readAll(stream);
        connection.disconnect();

        JSObject result = new JSObject();
        result.put("ok", status >= 200 && status < 300);
        result.put("status", status);
        result.put("body", responseBody);
        return result;
    }

    private static String readAll(InputStream stream) throws IOException {
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static JSONArray discoverHosts() throws IOException, JSONException {
        Set<String> broadcasts = new HashSet<>();
        broadcasts.add("255.255.255.255");
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        for (NetworkInterface networkInterface : Collections.list(interfaces)) {
            if (!networkInterface.isUp() || networkInterface.isLoopback()) continue;
            for (java.net.InterfaceAddress address : networkInterface.getInterfaceAddresses()) {
                InetAddress broadcast = address.getBroadcast();
                if (broadcast != null) broadcasts.add(broadcast.getHostAddress());
            }
        }

        byte[] request = DISCOVERY_REQUEST.getBytes(StandardCharsets.UTF_8);
        JSONArray hosts = new JSONArray();
        Set<String> foundUrls = new HashSet<>();
        long deadline = System.currentTimeMillis() + 1600;

        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setBroadcast(true);
            for (String broadcast : broadcasts) {
                DatagramPacket packet = new DatagramPacket(
                        request,
                        request.length,
                        InetAddress.getByName(broadcast),
                        DISCOVERY_PORT
                );
                socket.send(packet);
            }

            while (System.currentTimeMillis() < deadline) {
                int waitMs = (int) Math.max(1, deadline - System.currentTimeMillis());
                socket.setSoTimeout(waitMs);
                try {
                    byte[] buffer = new byte[512];
                    DatagramPacket response = new DatagramPacket(buffer, buffer.length);
                    socket.receive(response);
                    String message = new String(response.getData(), 0, response.getLength(), StandardCharsets.UTF_8);
                    String[] parts = message.split("\\|");
                    if (parts.length < 4 || !DISCOVERY_RESPONSE.equals(parts[0])) continue;

                    String url = "http://" + parts[1] + ":" + parts[2];
                    if (!foundUrls.add(url)) continue;
                    JSONObject host = new JSONObject();
                    host.put("ip", parts[1]);
                    host.put("url", url);
                    host.put("roomId", parts[3]);
                    hosts.put(host);
                } catch (SocketTimeoutException timeout) {
                    break;
                }
            }
        }

        return hosts;
    }

    private static class LocalRoomServer {
        private static final int DEFAULT_PORT = 3001;
        private final ExecutorService executor = Executors.newCachedThreadPool();
        private final Random random = new Random();
        private ServerSocket serverSocket;
        private Thread acceptThread;
        private DatagramSocket discoverySocket;
        private Thread discoveryThread;
        private volatile boolean running = false;
        private Room room;
        private String hostPlayerId;
        private int port = DEFAULT_PORT;
        private String ip = "127.0.0.1";

        synchronized JSObject startHost(String playerName, String avatar, String mode) throws IOException, JSONException {
            stop();

            room = new Room();
            room.id = randomRoomId();
            room.mode = "coop".equals(mode) ? "coop" : "pvp";
            room.gameState = "waiting";

            hostPlayerId = randomPlayerId();
            Player host = new Player(hostPlayerId, playerName, avatar, true);
            room.hostId = hostPlayerId;
            room.players.put(hostPlayerId, host);

            serverSocket = openServerSocket();
            port = serverSocket.getLocalPort();
            ip = findLocalIp();
            running = true;

            acceptThread = new Thread(this::acceptLoop, "PokemonRoomServer");
            acceptThread.start();
            startDiscoveryResponder();

            return startResult();
        }

        synchronized void stop() {
            running = false;
            if (serverSocket != null) {
                try {
                    serverSocket.close();
                } catch (IOException ignored) {
                }
                serverSocket = null;
            }
            if (acceptThread != null) {
                acceptThread.interrupt();
                acceptThread = null;
            }
            if (discoverySocket != null) {
                discoverySocket.close();
                discoverySocket = null;
            }
            if (discoveryThread != null) {
                discoveryThread.interrupt();
                discoveryThread = null;
            }
        }

        synchronized JSObject status() {
            JSObject result = new JSObject();
            result.put("running", running);
            if (running && room != null) {
                result.put("url", baseUrl());
                result.put("roomId", room.id);
                result.put("playerId", hostPlayerId);
                try {
                    result.put("state", room.toJson());
                } catch (JSONException ignored) {
                }
            }
            return result;
        }

        private ServerSocket openServerSocket() throws IOException {
            IOException lastError = null;
            for (int candidate = DEFAULT_PORT; candidate <= DEFAULT_PORT + 10; candidate++) {
                try {
                    ServerSocket socket = new ServerSocket();
                    socket.setReuseAddress(true);
                    socket.bind(new InetSocketAddress("0.0.0.0", candidate));
                    return socket;
                } catch (IOException error) {
                    lastError = error;
                }
            }
            throw lastError == null ? new IOException("No port available") : lastError;
        }

        private void startDiscoveryResponder() {
            try {
                DatagramSocket socket = new DatagramSocket(null);
                socket.setReuseAddress(true);
                socket.bind(new InetSocketAddress(DISCOVERY_PORT));
                discoverySocket = socket;
                discoveryThread = new Thread(this::discoveryLoop, "PokemonRoomDiscovery");
                discoveryThread.start();
            } catch (IOException error) {
                Log.w(TAG, "discovery responder unavailable", error);
            }
        }

        private void discoveryLoop() {
            while (running && discoverySocket != null && !discoverySocket.isClosed()) {
                try {
                    byte[] buffer = new byte[256];
                    DatagramPacket request = new DatagramPacket(buffer, buffer.length);
                    discoverySocket.receive(request);
                    String message = new String(
                            request.getData(),
                            0,
                            request.getLength(),
                            StandardCharsets.UTF_8
                    );
                    if (!DISCOVERY_REQUEST.equals(message) || room == null) continue;

                    String response = DISCOVERY_RESPONSE + "|" + ip + "|" + port + "|" + room.id;
                    byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                    DatagramPacket packet = new DatagramPacket(
                            bytes,
                            bytes.length,
                            request.getAddress(),
                            request.getPort()
                    );
                    discoverySocket.send(packet);
                } catch (IOException error) {
                    if (running) Log.w(TAG, "discovery response failed", error);
                }
            }
        }

        private void acceptLoop() {
            while (running && serverSocket != null) {
                try {
                    Socket socket = serverSocket.accept();
                    executor.submit(() -> handleSocket(socket));
                } catch (IOException error) {
                    if (running) {
                        Log.w(TAG, "accept failed", error);
                    }
                }
            }
        }

        private void handleSocket(Socket socket) {
            try (Socket client = socket) {
                HttpRequest request = readRequest(client.getInputStream());
                HttpResponse response = route(request);
                writeResponse(client.getOutputStream(), response);
            } catch (Exception error) {
                Log.w(TAG, "request failed", error);
            }
        }

        private synchronized HttpResponse route(HttpRequest request) throws JSONException {
            if ("OPTIONS".equals(request.method)) {
                return HttpResponse.empty(204);
            }

            if ("GET".equals(request.method) && "/health".equals(request.path)) {
                JSONObject json = new JSONObject();
                json.put("ok", true);
                json.put("service", "pokemon-adventure-mobile-host");
                json.put("roomId", room == null ? JSONObject.NULL : room.id);
                json.put("players", room == null ? 0 : room.players.size());
                return HttpResponse.json(200, json);
            }

            if (room == null) {
                return error(404, "还没有创建房间");
            }

            if ("GET".equals(request.method) && "/state".equals(request.path)) {
                resolveExpiredBattleRoundIfNeeded();
                cleanupMapCalls();
                return HttpResponse.json(200, room.toJson());
            }

            JSONObject body = request.body.isEmpty() ? new JSONObject() : new JSONObject(request.body);

            switch (request.path) {
                case "/join-room":
                    return joinRoom(body);
                case "/player-ready":
                    return playerReady(body, true);
                case "/player-unready":
                    return playerReady(body, false);
                case "/leave-room":
                    return leaveRoom(body);
                case "/select-continent":
                    return selectContinent(body);
                case "/player-move":
                    return playerMove(body);
                case "/map-call":
                    return mapCall(body);
                case "/map-role":
                    return mapRole(body);
                case "/encounter-battle":
                    return encounterBattle(body);
                case "/battle-result":
                    return clearTeamBattle();
                case "/battle-action":
                    return battleAction(body);
                case "/team-rescue":
                    return teamRescue(body);
                case "/capture-action":
                    return captureAction(body);
                default:
                    return error(404, "未知的房间指令");
            }
        }

        private HttpResponse joinRoom(JSONObject body) throws JSONException {
            String roomId = body.optString("roomId", "").toUpperCase();
            if (!room.id.equals(roomId)) return error(404, "房间号不对，请再看一眼房主屏幕");
            if (room.players.size() >= 3) return error(400, "房间已满，最多 3 人");
            if (!"waiting".equals(room.gameState)) return error(400, "游戏已经开始了");

            String playerId = randomPlayerId();
            Player player = new Player(
                    playerId,
                    body.optString("playerName", "训练师"),
                    body.optString("avatar", "👦"),
                    false
            );
            room.players.put(playerId, player);

            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("playerId", playerId);
            result.put("state", room.toJson());
            return HttpResponse.json(200, result);
        }

        private HttpResponse playerReady(JSONObject body, boolean ready) throws JSONException {
            Player player = room.players.get(body.optString("playerId"));
            if (player == null) return error(404, "玩家不在房间里");
            player.isReady = ready;
            player.monsterIds = body.optJSONArray("monsterIds");

            if (ready && room.players.size() >= 2 && allPlayersReady()) {
                room.gameState = "playing";
                if ("coop".equals(room.mode) && (room.continentId == null || room.continentId.isEmpty())) {
                    room.continentId = "volcano";
                }
                for (String id : room.players.keySet()) {
                    if (!room.playerPositions.has(id)) {
                        JSONObject position = new JSONObject();
                        position.put("x", 0);
                        position.put("y", 0);
                        room.playerPositions.put(id, position);
                    }
                }
                if ("pvp".equals(room.mode)) {
                    startPvpBattle();
                }
            }

            return okWithState();
        }

        private boolean allPlayersReady() {
            for (Player player : room.players.values()) {
                if (!player.isReady) return false;
            }
            return true;
        }

        private HttpResponse leaveRoom(JSONObject body) throws JSONException {
            String playerId = body.optString("playerId");
            Player leavingPlayer = room.players.get(playerId);
            if (leavingPlayer == null) return error(404, "玩家不在房间里");
            room.players.remove(playerId);
            room.playerPositions.remove(playerId);
            if (room.players.isEmpty()) {
                stop();
                JSONObject result = new JSONObject();
                result.put("ok", true);
                result.put("state", JSONObject.NULL);
                return HttpResponse.json(200, result);
            }

            // A one-player room is no longer a multiplayer session.  End it explicitly so the
            // remaining tablet can return to its ordinary adventure without force-closing the app.
            if (room.players.size() < 2) {
                room.gameState = "ended";
                room.teamBattle = null;
                room.mapCalls = new JSONArray();
                room.mapRoles = new JSONObject();
                for (Player player : room.players.values()) player.isReady = false;
            }

            if (playerId.equals(room.hostId)) {
                Player newHost = room.players.values().iterator().next();
                newHost.isHost = true;
                room.hostId = newHost.id;
            }

            return okWithState();
        }

        private HttpResponse selectContinent(JSONObject body) throws JSONException {
            if (!body.optString("playerId").equals(room.hostId)) {
                return error(403, "只有房主可以选择大陆");
            }
            room.continentId = body.optString("continentId", room.continentId);
            return okWithState();
        }

        private HttpResponse mapCall(JSONObject body) throws JSONException {
            String playerId = body.optString("playerId");
            Player player = room.players.get(playerId);
            if (player == null) return error(403, "训练师不在房间中");
            JSONObject call = new JSONObject();
            call.put("id", "C" + System.currentTimeMillis() + random.nextInt(1000));
            call.put("playerId", playerId);
            call.put("playerName", player.name);
            call.put("type", body.optString("type", "help"));
            call.put("message", body.optString("message", "来帮我！"));
            call.put("expiresAt", System.currentTimeMillis() + 8000L);
            room.mapCalls.put(call);
            cleanupMapCalls();
            return okWithState();
        }

        private HttpResponse mapRole(JSONObject body) throws JSONException {
            String playerId = body.optString("playerId");
            if (!room.players.containsKey(playerId)) return error(403, "训练师不在房间中");
            String role = body.optString("role", "clue");
            if (!"clue".equals(role) && !"supply".equals(role)) return error(400, "未知的远征路线");
            room.mapRoles.put(playerId, role);
            return okWithState();
        }

        private HttpResponse playerMove(JSONObject body) throws JSONException {
            JSONObject position = body.optJSONObject("position");
            if (position != null) {
                room.playerPositions.put(body.optString("playerId"), position);
            }
            return okWithState();
        }

        private HttpResponse encounterBattle(JSONObject body) throws JSONException {
            if (!"coop".equals(room.mode)) return error(400, "只有组队远征可以发起共同 Boss 战");
            if (room.players.size() < 2) return error(400, "至少两位训练师才能挑战共同 Boss");
            JSONObject battle = new JSONObject();
            int partySize = room.players.size();
            battle.put("battleId", "B" + System.currentTimeMillis());
            battle.put("mode", "coop");
            battle.put("phase", "active");
            battle.put("monsterName", body.optString("monsterName"));
            int monsterLevel = Math.max(1, Math.min(10, body.optInt("monsterLevel", 1)));
            int clueCount = countMapRole("clue");
            int supplyCount = countMapRole("supply");
            int bossMaxHp = Math.max(35, 45 + monsterLevel * 16 + partySize * 24 - clueCount * 12);
            battle.put("monsterLevel", monsterLevel);
            battle.put("bossLevel", monsterLevel);
            battle.put("bossElement", body.optString("monsterElement", "normal"));
            JSONArray bossElements = body.optJSONArray("monsterElements");
            if (bossElements == null || bossElements.length() == 0) {
                bossElements = new JSONArray();
                bossElements.put(body.optString("monsterElement", "normal"));
            }
            battle.put("bossElements", bossElements);
            battle.put("bossAvatar", body.optString("monsterAvatar", "mystery"));
            battle.put("bossName", body.optString("monsterName", "远征守卫"));
            battle.put("bossMaxHp", bossMaxHp);
            battle.put("bossHp", bossMaxHp);
            battle.put("teamMaxHp", partySize * 100 + supplyCount * 20);
            battle.put("teamHp", partySize * 100 + supplyCount * 20);
            battle.put("synergy", 0);
            battle.put("teamEnergy", 0);
            battle.put("round", 1);
            battle.put("requiredTags", nextRequiredTags(partySize, 1));
            battle.put("bossIntent", nextBossIntent(1, battle.optString("bossElement", "normal")));
            battle.put("roundDeadlineAt", System.currentTimeMillis() + 15000L);
            battle.put("actions", new JSONObject());
            battle.put("bossStatuses", new JSONArray());
            battle.put("playerStatuses", new JSONObject());
            JSONArray log = new JSONArray();
            log.put("共同 Boss 出现了！每一招都会造成伤害；凑齐默契目标可让这回合的合击更强。");
            if (clueCount > 0) log.put("🔎 队伍找到 " + clueCount + " 条线索，Boss 的初始压力降低了！");
            if (supplyCount > 0) log.put("🎒 队伍带回 " + supplyCount + " 份补给，远征体力提高了！");
            battle.put("log", log);
            battle.put("initiatorId", body.optString("playerId"));
            room.teamBattle = battle;
            room.mapRoles = new JSONObject();
            return okWithState();
        }

        private int countMapRole(String role) {
            int count = 0;
            for (String playerId : room.players.keySet()) if (role.equals(room.mapRoles.optString(playerId))) count++;
            return count;
        }

        private void startPvpBattle() throws JSONException {
            JSONObject battle = new JSONObject();
            int partySize = room.players.size();
            battle.put("battleId", "D" + System.currentTimeMillis());
            battle.put("mode", "pvp");
            battle.put("phase", "active");
            battle.put("round", 1);
            battle.put("targetScore", partySize == 2 ? 2 : 3);
            battle.put("actions", new JSONObject());
            battle.put("roundDeadlineAt", System.currentTimeMillis() + 15000L);
            JSONObject playerHp = new JSONObject();
            JSONObject scores = new JSONObject();
            for (String playerId : room.players.keySet()) {
                playerHp.put(playerId, 100);
                scores.put(playerId, 0);
            }
            battle.put("playerHp", playerHp);
            battle.put("scores", scores);
            JSONArray log = new JSONArray();
            log.put(partySize == 2 ? "友谊对战开始，先获得 2 枚斗技星获胜。" : "三角斗技开始，先获得 3 枚斗技星获胜。");
            battle.put("log", log);
            room.teamBattle = battle;
        }

        private HttpResponse battleAction(JSONObject body) throws JSONException {
            if (room.teamBattle == null || !"active".equals(room.teamBattle.optString("phase"))) {
                return error(400, "当前没有正在进行的共同战斗");
            }
            String playerId = body.optString("playerId");
            if (!room.players.containsKey(playerId)) return error(403, "训练师不在房间中");
            JSONObject actions = room.teamBattle.optJSONObject("actions");
            if (actions == null) actions = new JSONObject();
            if (actions.has(playerId)) return okWithState();

            JSONObject action = new JSONObject();
            action.put("tag", body.optString("tag", "burst"));
            action.put("skillName", body.optString("skillName", "伙伴冲击"));
            action.put("monsterName", body.optString("monsterName", "伙伴"));
            action.put("power", Math.max(10, Math.min(45, body.optInt("power", 22))));
            action.put("skillElement", body.optString("skillElement", "normal"));
            action.put("accuracy", Math.max(50, Math.min(100, body.optInt("accuracy", 100))));
            action.put("targetId", body.optString("targetId", ""));
            actions.put(playerId, action);
            room.teamBattle.put("actions", actions);

            if (actions.length() >= room.players.size()) {
                if ("coop".equals(room.teamBattle.optString("mode"))) {
                    resolveCoopRound(actions);
                } else {
                    resolvePvpRound(actions);
                }
            }
            return okWithState();
        }

        /** A three-point cooperative rescue keeps one bad round from ending the whole expedition. */
        private HttpResponse teamRescue(JSONObject body) throws JSONException {
            if (room.teamBattle == null || !"coop".equals(room.teamBattle.optString("mode"))
                    || !"active".equals(room.teamBattle.optString("phase"))) {
                return error(400, "现在不能使用团队救援");
            }
            String playerId = body.optString("playerId");
            if (!room.players.containsKey(playerId)) return error(403, "训练师不在房间中");
            int energy = room.teamBattle.optInt("teamEnergy", 0);
            int teamHp = room.teamBattle.optInt("teamHp", 0);
            int maxHp = room.teamBattle.optInt("teamMaxHp", 1);
            if (energy < 3) return error(400, "默契能量还不够");
            if (teamHp > maxHp * 0.6) return error(400, "队伍还没有到需要紧急救援的时候");
            room.teamBattle.put("teamEnergy", energy - 3);
            room.teamBattle.put("teamHp", Math.min(maxHp, teamHp + Math.max(28, maxHp / 4)));
            room.teamBattle.put("playerStatuses", new JSONObject());
            JSONArray log = room.teamBattle.optJSONArray("log");
            if (log == null) log = new JSONArray();
            log.put("💞 " + room.players.get(playerId).name + "发动紧急救援！远征队恢复体力并解除负面状态。");
            room.teamBattle.put("log", trimLog(log));
            return okWithState();
        }

        /** Shared capture has two short cooperative steps: calm the Boss, then throw together. */
        private HttpResponse captureAction(JSONObject body) throws JSONException {
            if (room.teamBattle == null || !"coop".equals(room.teamBattle.optString("mode"))
                    || !"victory".equals(room.teamBattle.optString("phase"))) {
                return error(400, "现在没有可以共同捕获的伙伴");
            }
            String playerId = body.optString("playerId");
            if (!room.players.containsKey(playerId)) return error(403, "训练师不在房间中");
            String expected = room.teamBattle.optString("capturePhase", "calm");
            String action = body.optString("action", "calm");
            if (!expected.equals(action)) return error(400, "请先完成当前的共同捕获步骤");
            JSONObject votes = room.teamBattle.optJSONObject("captureVotes");
            if (votes == null) votes = new JSONObject();
            votes.put(playerId, true);
            room.teamBattle.put("captureVotes", votes);
            if (votes.length() < room.players.size()) return okWithState();
            JSONArray log = room.teamBattle.optJSONArray("log");
            if (log == null) log = new JSONArray();
            if ("calm".equals(expected)) {
                room.teamBattle.put("capturePhase", "throw");
                room.teamBattle.put("captureVotes", new JSONObject());
                log.put("🤝 大家一起安抚了 " + room.teamBattle.optString("bossName", "Boss") + "。现在一起投出精灵球吧！");
            } else {
                room.teamBattle.put("capturePhase", "complete");
                room.teamBattle.put("captureAvailable", true);
                log.put("🎯 精灵球划出一道弧线！" + room.teamBattle.optString("bossName", "Boss") + "被共同冒险打动，愿意加入队伍！");
            }
            room.teamBattle.put("log", trimLog(log));
            return okWithState();
        }

        private void resolveCoopRound(JSONObject actions) throws JSONException {
            JSONObject battle = room.teamBattle;
            JSONArray log = battle.optJSONArray("log");
            if (log == null) log = new JSONArray();
            JSONArray required = battle.optJSONArray("requiredTags");
            int totalDamage = 0;
            Set<String> tags = new HashSet<>();
            int guards = 0;
            int teamHp = battle.optInt("teamHp");
            JSONObject playerStatuses = battle.optJSONObject("playerStatuses");
            if (playerStatuses == null) playerStatuses = new JSONObject();

            JSONObject bossStatusResult = resolveStatuses(
                    battle.optJSONArray("bossStatuses"),
                    battle.optString("bossName", "Boss"),
                    log
            );
            battle.put("bossStatuses", bossStatusResult.getJSONArray("statuses"));
            int bossHp = Math.max(0, battle.optInt("bossHp") - bossStatusResult.optInt("damage"));
            boolean bossCanAct = bossStatusResult.optBoolean("canAct", true);

            for (String playerId : room.players.keySet()) {
                JSONObject action = actions.optJSONObject(playerId);
                if (action == null) continue;
                JSONObject playerStatusResult = resolveStatuses(
                        playerStatuses.optJSONArray(playerId), room.players.get(playerId).name, log
                );
                playerStatuses.put(playerId, playerStatusResult.getJSONArray("statuses"));
                teamHp = Math.max(0, teamHp - playerStatusResult.optInt("damage"));
                if (!playerStatusResult.optBoolean("canAct", true)) {
                    log.put(room.players.get(playerId).name + " 的伙伴受到负面状态影响，本回合没能出招！");
                    continue;
                }

                if (random.nextInt(100) >= action.optInt("accuracy", 100)) {
                    log.put(room.players.get(playerId).name + " 的" + action.optString("monsterName", "伙伴")
                            + "使出" + action.optString("skillName", "伙伴冲击") + "，但是没有打中！");
                    continue;
                }

                double effectiveness = getMonsterEffectiveness(
                        action.optString("skillElement", "normal"), battle.optJSONArray("bossElements")
                );
                if (effectiveness <= 0) {
                    log.put(room.players.get(playerId).name + " 的" + action.optString("monsterName", "伙伴")
                            + "使出" + action.optString("skillName", "伙伴冲击") + "，但 Boss 的属性完全挡住了这招！");
                    continue;
                }
                int actionDamage = Math.max(4, Math.min(52, (int) Math.round(action.optInt("power", 22) * 0.55 * effectiveness)));
                totalDamage += actionDamage;
                String tag = action.optString("tag", "burst");
                tags.add(tag);
                if ("guard".equals(tag) || "support".equals(tag)) guards++;
                log.put(room.players.get(playerId).name + " 的" + action.optString("monsterName", "伙伴") + "使出"
                        + action.optString("skillName", "伙伴冲击") + "，命中造成 " + actionDamage + " 点伤害！"
                        + effectivenessLabel(effectiveness));
                battle.put("bossStatuses", tryApplyStatus(
                        battle.optJSONArray("bossStatuses"), action.optString("skillElement", "normal"),
                        battle.optString("bossName", "Boss"), log
                ));
            }

            battle.put("playerStatuses", playerStatuses);
            if (teamHp <= 0) {
                battle.put("teamHp", 0);
                battle.put("phase", "defeat");
                JSONObject roundResult = new JSONObject();
                roundResult.put("round", battle.optInt("round", 1));
                roundResult.put("totalDamage", totalDamage);
                roundResult.put("counterDamage", 0);
                roundResult.put("synergyHit", false);
                roundResult.put("outcome", "defeat");
                battle.put("lastRound", roundResult);
                log.put("负面状态让远征队失去最后一点体力，只能暂时撤退。" );
                battle.put("log", trimLog(log));
                return;
            }

            boolean synergyHit = true;
            for (int index = 0; required != null && index < required.length(); index++) {
                if (!tags.contains(required.getString(index))) synergyHit = false;
            }
            if (synergyHit) {
                totalDamage = (int) Math.round(totalDamage * 1.45);
                battle.put("synergy", Math.min(6, battle.optInt("synergy", 0) + tags.size()));
                int energy = Math.min(3, battle.optInt("teamEnergy", 0) + 1);
                battle.put("teamEnergy", energy);
                log.put("默契合击成功！本回合伤害提升 45%！");
                log.put("💞 获得 1 点默契能量（当前 " + energy + "/3）。");
            } else {
                totalDamage = (int) Math.round(totalDamage * 0.90);
                log.put("默契目标没有凑齐，但攻击依然有效；下回合换个战术还能打出合击！" );
            }

            bossHp = Math.max(0, bossHp - totalDamage);
            battle.put("bossHp", bossHp);
            JSONObject roundResult = new JSONObject();
            roundResult.put("round", battle.optInt("round", 1));
            roundResult.put("totalDamage", totalDamage);
            roundResult.put("synergyHit", synergyHit);
            if (bossHp <= 0) {
                battle.put("phase", "victory");
                battle.put("capturePhase", "calm");
                battle.put("captureVotes", new JSONObject());
                battle.put("captureAvailable", false);
                roundResult.put("counterDamage", 0);
                roundResult.put("outcome", "victory");
                battle.put("lastRound", roundResult);
                log.put("共同 Boss 被击败了！大家获得经验和精灵球，还能邀请它加入队伍！" );
                battle.put("log", trimLog(log));
                return;
            }

            int round = battle.optInt("round", 1);
            int bossDamage = 0;
            if (bossCanAct) {
                bossDamage = Math.min(38, 10 + round * 3 + room.players.size() * 2);
                bossDamage = Math.max(5, bossDamage - guards * 4);
            } else {
                log.put("Boss 被负面状态牵制，本回合没能反击！");
            }
            teamHp = Math.max(0, teamHp - bossDamage);
            battle.put("teamHp", teamHp);
            battle.put("rescueAvailable", battle.optInt("teamEnergy", 0) >= 3 && teamHp > 0 && teamHp <= battle.optInt("teamMaxHp", 1) * 0.6);
            roundResult.put("counterDamage", bossDamage);
            if (bossDamage > 0) {
                log.put("Boss 反击，远征队失去 " + bossDamage + " 点体力。" );
                String statusTargetId = randomPlayerIdFromRoom();
                if (statusTargetId != null) {
                    playerStatuses.put(statusTargetId, tryApplyStatus(
                            playerStatuses.optJSONArray(statusTargetId), battle.optString("bossElement", "normal"),
                            room.players.get(statusTargetId).name + " 的伙伴", log
                    ));
                    battle.put("playerStatuses", playerStatuses);
                }
            }
            if (teamHp <= 0) {
                battle.put("phase", "defeat");
                roundResult.put("outcome", "defeat");
                log.put("远征队暂时撤退。伙伴会疲劳 2 分钟，休息后再挑战吧！" );
            } else {
                int nextRound = round + 1;
                battle.put("round", nextRound);
                battle.put("requiredTags", nextRequiredTags(room.players.size(), nextRound));
                battle.put("bossIntent", nextBossIntent(nextRound, battle.optString("bossElement", "normal")));
                battle.put("actions", new JSONObject());
                battle.put("roundDeadlineAt", System.currentTimeMillis() + 15000L);
            }
            battle.put("lastRound", roundResult);
            battle.put("log", trimLog(log));
        }

        private void resolvePvpRound(JSONObject actions) throws JSONException {
            JSONObject battle = room.teamBattle;
            JSONObject hp = battle.getJSONObject("playerHp");
            JSONObject scores = battle.getJSONObject("scores");
            JSONArray log = battle.optJSONArray("log");
            if (log == null) log = new JSONArray();
            Map<String, Integer> targetHits = new LinkedHashMap<>();
            for (String playerId : room.players.keySet()) {
                String targetId = actions.getJSONObject(playerId).optString("targetId");
                if (room.players.containsKey(targetId) && !targetId.equals(playerId)) {
                    targetHits.put(targetId, targetHits.containsKey(targetId) ? targetHits.get(targetId) + 1 : 1);
                }
            }
            for (String playerId : room.players.keySet()) {
                JSONObject action = actions.getJSONObject(playerId);
                String targetId = action.optString("targetId");
                if (!room.players.containsKey(targetId) || targetId.equals(playerId)) continue;
                int damage = Math.max(8, action.optInt("power", 22) / 2);
                if (targetHits.get(targetId) != null && targetHits.get(targetId) > 1) damage = (int) Math.round(damage * 0.6);
                int targetHp = hp.optInt(targetId, 100) - damage;
                log.put(room.players.get(playerId).name + " 用 " + action.optString("skillName", "伙伴冲击") + " 攻击了 " + room.players.get(targetId).name + "。" );
                if (targetHp <= 0) {
                    hp.put(targetId, 100);
                    int score = scores.optInt(playerId, 0) + 1;
                    scores.put(playerId, score);
                    log.put(room.players.get(playerId).name + " 获得了一枚斗技星！");
                    if (score >= battle.optInt("targetScore", 2)) {
                        battle.put("phase", "victory");
                        battle.put("winnerId", playerId);
                    }
                } else {
                    hp.put(targetId, targetHp);
                }
            }
            if ("active".equals(battle.optString("phase"))) {
                battle.put("round", battle.optInt("round", 1) + 1);
                battle.put("actions", new JSONObject());
                battle.put("roundDeadlineAt", System.currentTimeMillis() + 15000L);
            }
            battle.put("log", trimLog(log));
        }

        private boolean isOneOf(String value, String... options) {
            for (String option : options) if (option.equals(value)) return true;
            return false;
        }

        /** State polling doubles as the room clock, so a distracted player cannot freeze the round forever. */
        private void resolveExpiredBattleRoundIfNeeded() throws JSONException {
            if (room.teamBattle == null || !"active".equals(room.teamBattle.optString("phase"))) return;
            long deadline = room.teamBattle.optLong("roundDeadlineAt", 0);
            if (deadline <= 0 || System.currentTimeMillis() < deadline) return;
            JSONObject actions = room.teamBattle.optJSONObject("actions");
            if (actions == null) actions = new JSONObject();
            JSONArray log = room.teamBattle.optJSONArray("log");
            if (log == null) log = new JSONArray();
            for (String playerId : room.players.keySet()) {
                if (actions.has(playerId)) continue;
                JSONObject fallback = new JSONObject();
                fallback.put("tag", "guard");
                fallback.put("skillName", "自动守护");
                fallback.put("monsterName", room.players.get(playerId).name + "的伙伴");
                fallback.put("skillElement", "normal");
                fallback.put("accuracy", 100);
                fallback.put("power", 16);
                if ("pvp".equals(room.teamBattle.optString("mode"))) {
                    for (String candidateId : room.players.keySet()) {
                        if (!candidateId.equals(playerId)) { fallback.put("targetId", candidateId); break; }
                    }
                }
                actions.put(playerId, fallback);
                log.put(room.players.get(playerId).name + "暂时没选招，伙伴自动使用了守护动作。");
            }
            room.teamBattle.put("actions", actions);
            room.teamBattle.put("log", log);
            if ("coop".equals(room.teamBattle.optString("mode"))) resolveCoopRound(actions);
            else resolvePvpRound(actions);
        }

        private void cleanupMapCalls() throws JSONException {
            JSONArray active = new JSONArray();
            long now = System.currentTimeMillis();
            for (int index = 0; index < room.mapCalls.length(); index++) {
                JSONObject call = room.mapCalls.getJSONObject(index);
                if (call.optLong("expiresAt", 0) > now) active.put(call);
            }
            room.mapCalls = active;
        }

        private JSONObject nextBossIntent(int round, String element) throws JSONException {
            JSONObject intent = new JSONObject();
            int phase = (round - 1) % 3;
            if (phase == 0) {
                intent.put("kind", "charge"); intent.put("emoji", "⚡"); intent.put("label", "正在蓄力");
                intent.put("description", "用克制属性攻击它，有机会在伤害上占优势。 ");
            } else if (phase == 1) {
                intent.put("kind", "sweep"); intent.put("emoji", "🌊"); intent.put("label", "准备横扫");
                intent.put("description", "有人选择守护或援护，能明显减少全队损失。 ");
            } else {
                intent.put("kind", "status"); intent.put("emoji", "🌫️"); intent.put("label", "准备特殊干扰");
                intent.put("description", "它可能施加负面状态；控制与爆发都能帮助队伍抢先推进。 ");
            }
            intent.put("element", element);
            return intent;
        }

        /** Mirrors the game's single-player type chart for the shared Boss. */
        private double getTypeEffectiveness(String attacker, String defender) {
            if ("normal".equals(attacker)) return "ghost".equals(defender) ? 0 : 1;
            if ("fire".equals(attacker)) return isOneOf(defender, "grass", "ice", "bug", "steel") ? 2 : isOneOf(defender, "water", "rock", "dragon") ? 0.5 : 1;
            if ("water".equals(attacker)) return isOneOf(defender, "fire", "ground", "rock") ? 2 : isOneOf(defender, "grass", "electric", "dragon") ? 0.5 : 1;
            if ("grass".equals(attacker)) return isOneOf(defender, "water", "ground", "rock") ? 2 : isOneOf(defender, "fire", "grass", "poison", "flying", "bug", "ice", "dragon", "steel") ? 0.5 : 1;
            if ("electric".equals(attacker)) return "ground".equals(defender) ? 0 : isOneOf(defender, "water", "flying") ? 2 : isOneOf(defender, "grass", "dragon") ? 0.5 : 1;
            if ("ice".equals(attacker)) return isOneOf(defender, "grass", "ground", "flying", "dragon") ? 2 : isOneOf(defender, "fire", "water", "ice", "steel") ? 0.5 : 1;
            if ("fighting".equals(attacker)) return "ghost".equals(defender) ? 0 : isOneOf(defender, "normal", "ice", "rock", "dark", "steel") ? 2 : isOneOf(defender, "poison", "flying", "psychic", "bug", "fairy") ? 0.5 : 1;
            if ("poison".equals(attacker)) return "steel".equals(defender) ? 0 : isOneOf(defender, "grass", "fairy") ? 2 : isOneOf(defender, "poison", "ground", "rock", "ghost") ? 0.5 : 1;
            if ("ground".equals(attacker)) return "flying".equals(defender) ? 0 : isOneOf(defender, "fire", "electric", "poison", "rock", "steel") ? 2 : isOneOf(defender, "grass", "bug") ? 0.5 : 1;
            if ("flying".equals(attacker)) return isOneOf(defender, "grass", "fighting", "bug") ? 2 : isOneOf(defender, "electric", "rock", "steel") ? 0.5 : 1;
            if ("psychic".equals(attacker)) return "dark".equals(defender) ? 0 : isOneOf(defender, "fighting", "poison") ? 2 : isOneOf(defender, "psychic", "steel") ? 0.5 : 1;
            if ("bug".equals(attacker)) return isOneOf(defender, "grass", "psychic", "dark") ? 2 : isOneOf(defender, "fire", "fighting", "poison", "flying", "ghost", "steel", "fairy") ? 0.5 : 1;
            if ("rock".equals(attacker)) return isOneOf(defender, "fire", "ice", "flying", "bug") ? 2 : isOneOf(defender, "fighting", "ground", "steel") ? 0.5 : 1;
            if ("ghost".equals(attacker)) return "normal".equals(defender) ? 0 : isOneOf(defender, "psychic", "ghost") ? 2 : "dark".equals(defender) ? 0.5 : 1;
            if ("dragon".equals(attacker)) return "fairy".equals(defender) ? 0 : "dragon".equals(defender) ? 2 : "steel".equals(defender) ? 0.5 : 1;
            if ("dark".equals(attacker)) return isOneOf(defender, "psychic", "ghost") ? 2 : isOneOf(defender, "fighting", "dark", "fairy", "light") ? 0.5 : 1;
            if ("steel".equals(attacker)) return isOneOf(defender, "ice", "rock", "fairy") ? 2 : isOneOf(defender, "fire", "water", "electric", "steel") ? 0.5 : 1;
            if ("fairy".equals(attacker)) return isOneOf(defender, "fighting", "dragon", "dark") ? 2 : isOneOf(defender, "poison", "steel") ? 0.5 : 1;
            if ("light".equals(attacker)) return isOneOf(defender, "dark", "ghost", "poison") ? 2 : isOneOf(defender, "rock", "steel", "fairy") ? 0.5 : 1;
            return 1;
        }

        private double getMonsterEffectiveness(String attacker, JSONArray defenders) throws JSONException {
            if (defenders == null || defenders.length() == 0) return 1;
            double effectiveness = 1;
            for (int index = 0; index < defenders.length(); index++) {
                effectiveness *= getTypeEffectiveness(attacker, defenders.getString(index));
            }
            return effectiveness;
        }

        private String effectivenessLabel(double effectiveness) {
            if (effectiveness >= 4) return " 四倍克制！";
            if (effectiveness > 1) return " 效果拔群！";
            if (effectiveness < 1) return " 效果不佳。";
            return "";
        }

        private JSONObject statusRule(String element) throws JSONException {
            JSONObject rule = new JSONObject();
            if ("fire".equals(element)) { rule.put("type", "burn"); rule.put("turns", 3); rule.put("chance", 45); rule.put("damage", 4); }
            else if ("poison".equals(element)) { rule.put("type", "poison"); rule.put("turns", 3); rule.put("chance", 60); rule.put("damage", 6); }
            else if ("electric".equals(element)) { rule.put("type", "paralysis"); rule.put("turns", 2); rule.put("chance", 50); rule.put("skip", 35); }
            else if ("ice".equals(element)) { rule.put("type", "freeze"); rule.put("turns", 1); rule.put("chance", 40); rule.put("skip", 100); }
            else if ("grass".equals(element) || "bug".equals(element)) { rule.put("type", "bind"); rule.put("turns", 2); rule.put("chance", "grass".equals(element) ? 45 : 40); rule.put("damage", 3); }
            else if ("psychic".equals(element) || "ghost".equals(element) || "dark".equals(element)) { rule.put("type", "fear"); rule.put("turns", 1); rule.put("chance", "ghost".equals(element) ? 50 : 45); rule.put("skip", 100); }
            else return null;
            return rule;
        }

        private String statusName(String type) {
            if ("burn".equals(type)) return "灼伤";
            if ("poison".equals(type)) return "中毒";
            if ("paralysis".equals(type)) return "麻痹";
            if ("freeze".equals(type)) return "冻住";
            if ("bind".equals(type)) return "缠绕";
            return "害怕";
        }

        private JSONArray tryApplyStatus(JSONArray current, String element, String targetName, JSONArray log) throws JSONException {
            JSONArray statuses = current == null ? new JSONArray() : current;
            JSONObject rule = statusRule(element);
            if (rule == null || random.nextInt(100) >= rule.getInt("chance")) return statuses;
            String type = rule.getString("type");
            JSONArray next = new JSONArray();
            boolean merged = false;
            for (int index = 0; index < statuses.length(); index++) {
                JSONObject status = statuses.getJSONObject(index);
                if (type.equals(status.optString("type"))) {
                    status.put("turnsRemaining", Math.max(status.optInt("turnsRemaining"), rule.getInt("turns")));
                    merged = true;
                }
                next.put(status);
            }
            if (!merged) {
                JSONObject status = new JSONObject();
                status.put("type", type);
                status.put("turnsRemaining", rule.getInt("turns"));
                status.put("damage", rule.optInt("damage", 0));
                status.put("skip", rule.optInt("skip", 0));
                next.put(status);
            }
            log.put(targetName + " 进入" + statusName(type) + "状态！");
            return next;
        }

        private JSONObject resolveStatuses(JSONArray current, String targetName, JSONArray log) throws JSONException {
            JSONArray statuses = current == null ? new JSONArray() : current;
            JSONArray next = new JSONArray();
            int damage = 0;
            boolean canAct = true;
            for (int index = 0; index < statuses.length(); index++) {
                JSONObject status = statuses.getJSONObject(index);
                String type = status.optString("type");
                int tick = status.optInt("damage", 0);
                if (tick > 0) {
                    damage += tick;
                    log.put(targetName + " 受到" + statusName(type) + "影响，损失 " + tick + " 点体力。");
                }
                int skipChance = status.optInt("skip", 0);
                if (skipChance > 0 && random.nextInt(100) < skipChance) {
                    canAct = false;
                    log.put(targetName + " 因为" + statusName(type) + "，这回合没能行动。");
                }
                int turns = status.optInt("turnsRemaining", 1) - 1;
                if (turns > 0) {
                    status.put("turnsRemaining", turns);
                    next.put(status);
                } else {
                    log.put(targetName + " 的" + statusName(type) + "状态消失了。");
                }
            }
            JSONObject result = new JSONObject();
            result.put("statuses", next);
            result.put("damage", damage);
            result.put("canAct", canAct);
            return result;
        }

        private String randomPlayerIdFromRoom() {
            if (room.players.isEmpty()) return null;
            int target = random.nextInt(room.players.size());
            int index = 0;
            for (String playerId : room.players.keySet()) {
                if (index++ == target) return playerId;
            }
            return room.players.keySet().iterator().next();
        }

        private JSONArray nextRequiredTags(int partySize, int round) throws JSONException {
            String[][] rotations = {
                {"burst", "control", "guard"},
                {"support", "burst", "control"},
                {"guard", "support", "burst"}
            };
            String[] choice = rotations[(round - 1) % rotations.length];
            JSONArray result = new JSONArray();
            for (int index = 0; index < partySize; index++) result.put(choice[index]);
            return result;
        }

        private JSONArray trimLog(JSONArray log) throws JSONException {
            JSONArray trimmed = new JSONArray();
            int start = Math.max(0, log.length() - 7);
            for (int index = start; index < log.length(); index++) trimmed.put(log.get(index));
            return trimmed;
        }

        private HttpResponse clearTeamBattle() throws JSONException {
            room.teamBattle = null;
            return okWithState();
        }

        private HttpResponse okWithState() throws JSONException {
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("state", room.toJson());
            return HttpResponse.json(200, result);
        }

        private HttpResponse error(int status, String message) throws JSONException {
            JSONObject json = new JSONObject();
            json.put("ok", false);
            json.put("message", message);
            return HttpResponse.json(status, json);
        }

        private JSObject startResult() throws JSONException {
            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("url", baseUrl());
            result.put("ip", ip);
            result.put("port", port);
            result.put("roomId", room.id);
            result.put("playerId", hostPlayerId);
            result.put("state", room.toJson());
            return result;
        }

        private String baseUrl() {
            return "http://" + ip + ":" + port;
        }

        private String randomRoomId() {
            String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            StringBuilder builder = new StringBuilder();
            for (int index = 0; index < 6; index++) {
                builder.append(alphabet.charAt(random.nextInt(alphabet.length())));
            }
            return builder.toString();
        }

        private String randomPlayerId() {
            return "P" + System.currentTimeMillis() + random.nextInt(10000);
        }

        private String findLocalIp() {
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                for (NetworkInterface networkInterface : Collections.list(interfaces)) {
                    if (!networkInterface.isUp() || networkInterface.isLoopback()) continue;
                    Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                    for (InetAddress address : Collections.list(addresses)) {
                        if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                            return address.getHostAddress();
                        }
                    }
                }
            } catch (Exception ignored) {
            }
            return "127.0.0.1";
        }

        private HttpRequest readRequest(InputStream input) throws IOException {
            ByteArrayOutputStream headerBytes = new ByteArrayOutputStream();
            int previous = -1;
            int current;
            int matched = 0;
            byte[] marker = new byte[]{'\r', '\n', '\r', '\n'};
            while ((current = input.read()) != -1) {
                headerBytes.write(current);
                if (current == marker[matched]) {
                    matched++;
                    if (matched == marker.length) break;
                } else {
                    matched = current == marker[0] ? 1 : 0;
                }
                previous = current;
            }

            String headerText = headerBytes.toString(StandardCharsets.ISO_8859_1.name());
            String[] lines = headerText.split("\r\n");
            if (lines.length == 0) throw new IOException("empty request");

            String[] requestLine = lines[0].split(" ");
            String method = requestLine.length > 0 ? requestLine[0] : "GET";
            String target = requestLine.length > 1 ? requestLine[1] : "/";
            int contentLength = 0;
            for (String line : lines) {
                int colon = line.indexOf(':');
                if (colon > 0 && "content-length".equalsIgnoreCase(line.substring(0, colon).trim())) {
                    contentLength = Integer.parseInt(line.substring(colon + 1).trim());
                }
            }

            byte[] bodyBytes = input.readNBytes(contentLength);
            String body = new String(bodyBytes, StandardCharsets.UTF_8);

            String path = target;
            String query = "";
            int queryIndex = target.indexOf('?');
            if (queryIndex >= 0) {
                path = target.substring(0, queryIndex);
                query = target.substring(queryIndex + 1);
            }

            return new HttpRequest(method, path, query, body);
        }

        private void writeResponse(OutputStream output, HttpResponse response) throws IOException {
            byte[] body = response.body.getBytes(StandardCharsets.UTF_8);
            String headers = "HTTP/1.1 " + response.status + " OK\r\n"
                    + "Content-Type: " + response.contentType + "\r\n"
                    + "Access-Control-Allow-Origin: *\r\n"
                    + "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                    + "Access-Control-Allow-Headers: Content-Type\r\n"
                    + "Content-Length: " + body.length + "\r\n"
                    + "Connection: close\r\n\r\n";
            output.write(headers.getBytes(StandardCharsets.UTF_8));
            output.write(body);
            output.flush();
        }
    }

    private static class Room {
        String id;
        String hostId;
        String mode;
        String gameState;
        String continentId;
        LinkedHashMap<String, Player> players = new LinkedHashMap<>();
        JSONObject playerPositions = new JSONObject();
        JSONArray mapCalls = new JSONArray();
        JSONObject mapRoles = new JSONObject();
        JSONObject teamBattle;

        JSONObject toJson() throws JSONException {
            JSONObject json = new JSONObject();
            json.put("roomId", id);
            json.put("mode", mode);
            json.put("gameState", gameState);
            json.put("continentId", continentId == null ? JSONObject.NULL : continentId);
            json.put("playerPositions", playerPositions);
            json.put("mapCalls", mapCalls);
            json.put("mapRoles", mapRoles);
            json.put("teamBattle", teamBattle == null ? JSONObject.NULL : teamBattle);

            JSONArray playerArray = new JSONArray();
            for (Player player : players.values()) {
                playerArray.put(player.toJson());
            }
            json.put("players", playerArray);
            return json;
        }
    }

    private static class Player {
        String id;
        String name;
        String avatar;
        boolean isHost;
        boolean isReady = false;
        JSONArray monsterIds = new JSONArray();

        Player(String id, String name, String avatar, boolean isHost) {
            this.id = id;
            this.name = name;
            this.avatar = avatar;
            this.isHost = isHost;
        }

        JSONObject toJson() throws JSONException {
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("name", name);
            json.put("avatar", avatar);
            json.put("isHost", isHost);
            json.put("isReady", isReady);
            json.put("monsterIds", monsterIds == null ? new JSONArray() : monsterIds);
            return json;
        }
    }

    private static class HttpRequest {
        String method;
        String path;
        String query;
        String body;

        HttpRequest(String method, String path, String query, String body) {
            this.method = method;
            this.path = path;
            this.query = query;
            this.body = body;
        }
    }

    private static class HttpResponse {
        int status;
        String contentType;
        String body;

        static HttpResponse json(int status, JSONObject json) {
            HttpResponse response = new HttpResponse();
            response.status = status;
            response.contentType = "application/json; charset=utf-8";
            response.body = json.toString();
            return response;
        }

        static HttpResponse empty(int status) {
            HttpResponse response = new HttpResponse();
            response.status = status;
            response.contentType = "text/plain; charset=utf-8";
            response.body = "";
            return response;
        }
    }
}
