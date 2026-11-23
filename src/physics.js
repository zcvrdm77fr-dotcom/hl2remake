import * as THREE from 'three';

// Source-inspired movement in metres. Ground friction, ground acceleration and
// air acceleration are separate. Holding jump queues the next landing-frame jump.
export class SourceMovement {
  constructor(camera, colliders, spawn = new THREE.Vector3(0, 0, 24)) {
    this.camera = camera;
    this.colliders = colliders;
    this.feet = spawn.clone();
    this.velocity = new THREE.Vector3();
    this.radius = 0.34;
    this.height = 1.82;
    this.eyeHeight = 1.66;
    this.gravity = 19.6;
    this.jumpSpeed = 7.25;
    this.jumpBufferDuration = 0.14;
    this.coyoteDuration = 0.10;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = this.coyoteDuration;
    this.groundAcceleration = 12.5;
    this.airAcceleration = 14.0;
    this.groundFriction = 4.35;
    this.stopSpeed = 3.4;
    this.groundSpeed = 7.0;
    this.sprintSpeed = 8.6;
    this.airWishSpeed = 7.2;
    this.maxSpeed = 17.0;
    this.grounded = true;
    this.bobTime = 0;
    this.viewBob = 0;
    this.landPunch = 0;
    this.lastLandingSpeed = 0;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.wish = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.syncCamera();
  }

  reset(spawn = new THREE.Vector3(0, 0, 24)) {
    this.feet.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.bobTime = 0;
    this.viewBob = 0;
    this.landPunch = 0;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = this.coyoteDuration;
    this.lastLandingSpeed = 0;
    this.syncCamera();
  }

  applyFriction(dt) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 0.0001) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      return;
    }
    const control = Math.max(speed, this.stopSpeed);
    const next = Math.max(0, speed - control * this.groundFriction * dt);
    const scale = next / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  accelerate(direction, wishSpeed, acceleration, dt) {
    if (wishSpeed <= 0.0001) return;
    const current = this.velocity.x * direction.x + this.velocity.z * direction.z;
    const add = wishSpeed - current;
    if (add <= 0) return;
    const amount = Math.min(add, acceleration * wishSpeed * dt);
    this.velocity.x += direction.x * amount;
    this.velocity.z += direction.z * amount;
  }

  blocked(x, z) {
    if (x < -18.2 || x > 18.2 || z < -296 || z > 39) return true;
    for (const c of this.colliders) {
      const minY = c.minY ?? 0;
      const maxY = c.maxY ?? 4.8;
      if (this.feet.y + this.height <= minY || this.feet.y >= maxY) continue;
      const nearX = THREE.MathUtils.clamp(x, c.minX, c.maxX);
      const nearZ = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
      const dx = x - nearX;
      const dz = z - nearZ;
      if (dx * dx + dz * dz < this.radius * this.radius) return true;
    }
    return false;
  }

  moveAndSlide(dt) {
    const dx = this.velocity.x * dt;
    const dz = this.velocity.z * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.09));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (!this.blocked(this.feet.x + sx, this.feet.z)) this.feet.x += sx;
      else this.velocity.x = 0;
      if (!this.blocked(this.feet.x, this.feet.z + sz)) this.feet.z += sz;
      else this.velocity.z = 0;
    }
  }

  update(dt, cameraDirection, input, jumpHeld, sprintHeld) {
    dt = Math.min(dt, 1 / 30);
    this.forward.set(cameraDirection.x, 0, cameraDirection.z);
    if (this.forward.lengthSq() < 0.0001) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.up).normalize();

    this.wish.set(0, 0, 0);
    if (this.grounded) {
      // Ground movement uses the full WASD input.
      this.wish.addScaledVector(this.forward, input.forward);
      this.wish.addScaledVector(this.right, input.right);
    } else {
      // Air control is deliberately strafe-only: W/S cannot steer in mid-air.
      // Turning the view while holding A or D changes the strafe acceleration
      // direction, allowing Source-style curved air-strafes to build momentum.
      this.wish.addScaledVector(this.right, input.right);
    }

    const inputLength = Math.min(1, this.wish.length());
    if (this.wish.lengthSq() > 0.0001) this.wish.normalize();
    const wishSpeed = (sprintHeld ? this.sprintSpeed : this.groundSpeed) * inputLength;

    // A short jump buffer makes a landing-frame bunnyhop reliable, while
    // coyote time forgives the tiny gap between a ledge and the next physics tick.
    this.jumpBufferTimer = jumpHeld
      ? this.jumpBufferDuration
      : Math.max(0, this.jumpBufferTimer - dt);
    if (this.grounded) this.coyoteTimer = this.coyoteDuration;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    // No landing-frame friction when a buffered jump fires: bhop speed survives.
    const canJump = this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0);
    if (canJump) {
      this.grounded = false;
      this.velocity.y = this.jumpSpeed;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.landPunch = 0;
    } else if (this.grounded) {
      this.applyFriction(dt);
    }

    if (inputLength > 0.001) {
      if (this.grounded) this.accelerate(this.wish, wishSpeed, this.groundAcceleration, dt);
      else this.accelerate(this.wish, Math.min(wishSpeed, this.airWishSpeed), this.airAcceleration, dt);
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / horizontalSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    if (!this.grounded) {
      const previousY = this.feet.y;
      const gravityScale = jumpHeld && this.velocity.y > 0 ? 0.76 : 1.0;
      this.velocity.y -= this.gravity * gravityScale * dt;
      const nextY = this.feet.y + this.velocity.y * dt;
      let ceiling = Infinity;
      if (this.velocity.y > 0) {
        for (const c of this.colliders) {
          if (this.feet.x + this.radius <= c.minX || this.feet.x - this.radius >= c.maxX) continue;
          if (this.feet.z + this.radius <= c.minZ || this.feet.z - this.radius >= c.maxZ) continue;
          if (c.minY > previousY + this.height && c.minY < nextY + this.height) ceiling = Math.min(ceiling, c.minY);
        }
      }
      if (ceiling < Infinity) {
        this.feet.y = ceiling - this.height;
        this.velocity.y = 0;
      } else if (nextY <= 0) {
        this.feet.y = 0;
        this.grounded = true;
        this.coyoteTimer = this.coyoteDuration;
        this.lastLandingSpeed = Math.abs(this.velocity.y);
        this.landPunch = Math.min(1, this.lastLandingSpeed / this.jumpSpeed);
        this.velocity.y = 0;
      } else {
        this.feet.y = nextY;
      }
    }

    this.moveAndSlide(dt);
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.grounded && speed > 0.4) this.bobTime += dt * (speed > 7.5 ? 15 : 11);
    this.landPunch = Math.max(0, this.landPunch - dt * 3.8);
    this.viewBob = this.grounded ? Math.sin(this.bobTime) * Math.min(0.035, speed * 0.0032) : 0;
    this.syncCamera();

    return { speed, grounded: this.grounded, verticalSpeed: this.velocity.y, jumpHeight: this.feet.y };
  }

  syncCamera() {
    this.camera.position.set(
      this.feet.x,
      this.eyeHeight + this.feet.y + this.viewBob - this.landPunch * 0.075,
      this.feet.z
    );
  }
}
