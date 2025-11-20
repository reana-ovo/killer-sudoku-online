import * as Y from 'yjs';
class Observable {
  constructor() {
    this._observers = new Map();
  }

  on(name, f) {
    if (!this._observers.has(name)) {
      this._observers.set(name, new Set());
    }
    this._observers.get(name).add(f);
  }

  off(name, f) {
    const observers = this._observers.get(name);
    if (observers) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }

  emit(name, args) {
    const observers = this._observers.get(name);
    if (observers) {
      observers.forEach(f => f(...args));
    }
  }
  
  destroy() {
    this._observers.clear();
  }
}

export class SupabaseYjsProvider extends Observable {
  constructor(doc, supabase, { channel, tableName, roomId }) {
    super();
    this.doc = doc;
    this.supabase = supabase;
    this.channelName = channel;
    this.tableName = tableName;
    this.roomId = roomId;
    this.channel = null;
    this.awareness = null;
    this.connected = false;
    this.synced = false;
    
    // Debounce save
    this._saveInterval = null;
    this._lastSaveTime = 0;
    this._pendingSave = false;

    this.onUpdate = this.onUpdate.bind(this);
    this.onConnect = this.onConnect.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    
    // this.connect(); // Removed to avoid race condition
  }

  async connect() {
    if (this.channel) return;

    console.log('SupabaseYjsProvider: Connecting...');
    
    // 1. Load initial state from DB
    const loadedFromDb = await this.loadFromDb();

    // If DB was empty but we have local content (e.g. we just created the game), save it!
    if (!loadedFromDb) {
      const stateVector = Y.encodeStateVector(this.doc);
      // If state vector is not empty (meaning we have some data), save it.
      // A simplified check: just check if we have any data in the doc.
      // Or simpler: just saveToDb() if we are the creator. 
      // Since we don't explicitly know if we are the creator, we can check if the doc is not empty.
      // But Y.Doc is always "not empty" metadata-wise. 
      // Let's check if the board array has items.
      const board = this.doc.getArray('board');
      if (board.length > 0) {
        console.log('SupabaseYjsProvider: DB empty but local has data, saving initial state...');
        await this.saveToDb();
      }
    }

    // 2. Subscribe to Realtime
    this.channel = this.supabase.channel(this.channelName);
    
    this.channel
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        // Apply remote update
        // Payload is expected to be an array of numbers (Uint8Array serialized)
        const update = new Uint8Array(payload);
        Y.applyUpdate(this.doc, update, this);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.onConnect();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.onDisconnect();
        }
      });

    // 3. Listen to local updates
    this.doc.on('update', this.onUpdate);
  }

  onConnect() {
    console.log('SupabaseYjsProvider: Connected');
    this.connected = true;
    this.emit('connect', [this]);
    this.emit('status', [{ status: 'connected' }]);
    this.synced = true; // Assume synced after load + connect
    this.emit('sync', [true]);
  }

  onDisconnect() {
    console.log('SupabaseYjsProvider: Disconnected');
    this.connected = false;
    this.emit('disconnect', [this]);
    this.emit('status', [{ status: 'disconnected' }]);
  }

  onUpdate(update, origin) {
    if (origin === this) return; // Ignore updates applied by this provider

    // 1. Broadcast to other clients
    if (this.channel && this.connected) {
      this.channel.send({
        type: 'broadcast',
        event: 'update',
        payload: Array.from(update), // Convert Uint8Array to regular array for JSON
      }).catch(err => console.error('Broadcast failed:', err));
    }

    // 2. Trigger save to DB (debounced)
    this.scheduleSave();
  }

  scheduleSave() {
    const now = Date.now();
    const timeSinceLastSave = now - this._lastSaveTime;
    const SAVE_INTERVAL = 2000; // Save at most every 2 seconds

    if (timeSinceLastSave > SAVE_INTERVAL) {
      this.saveToDb();
    } else if (!this._pendingSave) {
      this._pendingSave = true;
      setTimeout(() => {
        this._pendingSave = false;
        this.saveToDb();
      }, SAVE_INTERVAL - timeSinceLastSave);
    }
  }

  async saveToDb() {
    this._lastSaveTime = Date.now();
    
    // Encode full state
    const update = Y.encodeStateAsUpdate(this.doc);
    const hexUpdate = this.toHex(update);

    // Upsert to DB
    const { error } = await this.supabase
      .from(this.tableName)
      .upsert({ 
        room_id: this.roomId, 
        update: hexUpdate 
      }, { onConflict: 'room_id' });

    if (error) {
      console.error('SupabaseYjsProvider: Save failed', error);
    } else {
      // console.log('SupabaseYjsProvider: Saved to DB');
    }
  }

  async loadFromDb() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('update')
      .eq('room_id', this.roomId)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('SupabaseYjsProvider: Load failed', error);
      }
      return;
    }

    if (data && data.update) {
      try {
        const update = this.fromHex(data.update);
        Y.applyUpdate(this.doc, update, this);
        console.log('SupabaseYjsProvider: Loaded state from DB');
        return true;
      } catch (e) {
        console.error('SupabaseYjsProvider: Failed to parse DB update', e);
      }
    }
    return false;
  }

  destroy() {
    this.doc.off('update', this.onUpdate);
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }
    this.connected = false;
  }

  // Helpers for bytea <-> hex
  toHex(uint8Array) {
    return '\\x' + Array.from(uint8Array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  fromHex(hexString) {
    if (hexString.startsWith('\\x')) hexString = hexString.slice(2);
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  }
}
