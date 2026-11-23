import * as THREE from 'three';

// Source-inspired first-person movement, expressed in metres rather than Source units.
// Ground acceleration/friction and air acceleration are intentionally separate.
export class SourceMovement {
  constructor(camera, spawn = new THREE.Vector3(0, 0, 28)) {
    this.camera = camera;
    this.feet = spawn.clone();
    this.velocity = new THREE.Vector3();
    this.radius = 0.36;
    this.eyeHeight = 1.68;
    this.grounded = true;
    this.jumpVelocity = 8.55;
    this.gravity = 22.0;
    this.groundAcceleration = 12.0;
    this.airAcceleration = 12.5;
    this.groundFriction = 5.25;
    this.stopSpeed = 4.0;
    this.baseSpeed = 7.2;
    this.sprintSpeed = 8.4;
    this.airWishSpeed = 8.4;
    this.maxSpeed = 22.0;
    this.jumpHeight = 0;
    this.bobTime = 0;
    this.landImpulse = 0;
    this.lastVerticalSpeed = 0;
    this.wish = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this._velocityLength = 0;
    this.syncCamera();
  }

  reset(spawn = new THREE.Vector3(0, 0, 28)) {
    this.feet.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.jumpHeight = 0;
    this.bobTime = 0;
    this.landImpulse = 0;
    this.lastVerticalSpeed = 0;
    this.syncCamera();
  }

  applyFriction(dt) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 0.001) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      return;
    }
    const control = Math.max(speed, this.stopSpeed);
    const drop = control * this.groundFriction * dt;
    const next = Math.max(0, speed - drop);
    const scale = next / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  accelerate(wishDirection, wishSpeed, acceleration, dt) {
    if (wishSpeed <= 0.0001) return;
    const currentSpeed = this.velocity.x * wishDirection.x + this.velocity.z * wishDirection.z;
    const addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0) return;
    const accelSpeed = Math.min(addSpeed, acceleration * wishSpeed * dt);
    this.velocity.x += wishDirection.x * accelSpeed;
    this.velocity.z += wishDirection.z * accelSpeed;
  }

  blocked(x, z, colliders) {
    if (x < -28.5 || x > 28.5 || z < -112 || z > 43) return true;
    for (const c of colliders) {
      const nearX = THREE.MathUtils.clamp(x, c.minX, c.maxX);
      const nearZ = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
      const dx = x - nearX;
      const dz = z - nearZ;
      if (dx * dx + dz * dz < this.radius * this.radius) return true;
    }
    return false;
  }

  moveAndSlide(dt, colliders) {
    const dx = this.velocity.x * dt;
    const dz = this.velocity.z * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.12));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (!this.blocked(this.feet.x + sx, this.feet.z, colliders)) {
        this.feet.x += sx;
      } else {
        this.velocity.x = 0;
      }
      if (!this.blocked(this.feet.x, this.feet.z + sz, colliders)) {
        this.feet.z += sz;
      } else {
        this.velocity.z = 0;
      }
    }
  }

  update(dt, cameraDirection, input, colliders, jumpHeld, sprintHeld) {
    dt = Math.min(dt, 0.04);
    this.forward.set(cameraDirection.x, 0, cameraDirection.z).normalize();
    if (this.forward.lengthSq() < 0.001) this.forward.set(0, 0, -1);
    this.right.crossVectors(this.forward, this.up).normalize();

    this.wish.set(0, 0, 0);
    this.wish.addScaledVector(this.forward, input.forward);
    this.wish.addScaledVector(this.right, input.right);
    const inputLength = Math.min(1, this.wish.length());
    if (this.wish.lengthSq() > 0.0001) this.wish.normalize();

    const wishSpeed = (sprintHeld ? this.sprintSpeed : this.baseSpeed) * inputLength;

    // Auto-bhop: holding Space queues the next jump for the first grounded frame.
    // Crucially, no ground friction is applied on that landing frame.
    if (this.grounded && jumpHeld) {
      this.grounded = false;
      this.velocity.y = this.jumpVelocity;
      this.landImpulse = 0;
    } else if (this.grounded) {
      this.applyFriction(dt);
    }

    if (inputLength > 0.001) {
      if (this.grounded) {
        this.accelerate(this.wish, wishSpeed, this.groundAcceleration, dt);
      } else {
        this.accelerate(this.wish, Math.min(wishSpeed, this.airWishSpeed), this.airAcceleration, dt);
      }
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / horizontalSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    if (!this.grounded) {
      this.velocity.y -= this.gravity * dt;
      this.feet.y += this.velocity.y * dt;
      if (this.feet.y <= 0) {
        this.feet.y = 0;
        this.grounded = true;
        this.landImpulse = Math.min(1, Math.abs(this.velocity.y) / this.jumpVelocity);
        this.velocity.y = 0;
      }
    }

    this.moveAndSlide(dt, colliders);
    if (this.grounded && inputLength > 0.04) this.bobTime += dt * (horizontalSpeed > 7.5 ? 15 : 11);
    this.syncCamera();
    return {
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      grounded: this.grounded,
      verticalSpeed: this.velocity.y,
      jumpHeight: this.feet.y
    };
  }

  syncCamera() {
    const bob = this.grounded ? Math.sin(this.bobTime) * Math.min(0.035, Math.hypot(this.velocity.x, this.velocity.z) * 0.0038) : 0;
    this.camera.position.set(this.feet.x, this.eyeHeight + this.feet.y + bob, this.feet.z);
  }
}
