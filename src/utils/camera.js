import { Viewer } from 'prismarine-viewer/viewer/lib/viewer.js';
import { WorldView } from 'prismarine-viewer/viewer/lib/worldview.js';
import { getBufferFromStream } from 'prismarine-viewer/viewer/lib/simpleUtils.js';

import THREE from 'three';
import { createCanvas } from 'node-canvas-webgl/lib/index.js';
import fs from 'fs/promises';
import { Vec3 } from 'vec3';
import { EventEmitter } from 'events';

import worker_threads from 'worker_threads';
global.Worker = worker_threads.Worker;



export class Camera extends EventEmitter {
    constructor (bot) {
      super()
      this.bot = bot
      this.viewDistance = 4
      this.width = 512
      this.height = 512
      this.canvas = createCanvas(this.width, this.height)
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas })
      this.viewer = new Viewer(this.renderer)
      this._init().then(() => {
        this.emit('ready')
      })
    }
  
    async _init () {
      const botPos = this.bot.entity.position
      // const center = new Vec3(botPos.x, botPos.y + 10, botPos.z)
      const center = new Vec3(botPos.x, botPos.y+2, botPos.z)
      this.viewer.setVersion(this.bot.version)
      console.log('center :', center)
      // Load world
      const worldView = new WorldView(this.bot.world, this.viewDistance, center)
      this.viewer.listen(worldView)
  
      this.viewer.camera.position.set(center.x, center.y, center.z)
  
      await worldView.init(center)
    }
  
    async takePicture (name, x, y, z) {  
      this.viewer.camera.lookAt(x, y, z)
      console.info('Waiting for world to load')
      await new Promise(resolve => setTimeout(resolve, 5000))
      this.renderer.render(this.viewer.scene, this.viewer.camera)
  
      const imageStream = this.canvas.createJPEGStream({
        bufsize: 4096,
        quality: 100,
        progressive: false
      })
      const buf = await getBufferFromStream(imageStream)
      let stats
      try {
        stats = await fs.stat(`bots/${this.bot.username}/screenshots`)
      } catch (e) {
        if (!stats?.isDirectory()) {
          await fs.mkdir(`bots/${this.bot.username}/screenshots`)
        }
      }
      await fs.writeFile(`bots/${this.bot.username}/screenshots/${name}.jpg`, buf)
      console.log('saved', name)
    }
  }
  