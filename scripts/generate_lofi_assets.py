import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "public", "assets", "models")

os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_mat(name, color, roughness=0.85, metallic=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")

    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic

        if emission:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = emission_strength

    return mat


MAT_BLACK = make_mat("deep_black", (0.005, 0.005, 0.006, 1))
MAT_DARK = make_mat("dark_rubber", (0.025, 0.026, 0.03, 1))
MAT_COAT = make_mat("dead_coat", (0.01, 0.011, 0.013, 1))
MAT_METAL = make_mat("dull_metal", (0.45, 0.45, 0.43, 1), metallic=0.25)
MAT_RUST = make_mat("rust_red", (0.38, 0.08, 0.06, 1), roughness=0.95)
MAT_RUST_DARK = make_mat("dark_rust", (0.18, 0.05, 0.045, 1), roughness=0.98)
MAT_YELLOW = make_mat(
    "fuse_yellow_glow",
    (1.0, 0.78, 0.22, 1),
    emission=(1.0, 0.62, 0.16, 1),
    emission_strength=1.8,
)
MAT_RED_EMIT = make_mat(
    "red_warning_glow",
    (0.7, 0.04, 0.035, 1),
    emission=(1.0, 0.02, 0.02, 1),
    emission_strength=1.6,
)
MAT_WHITE_EMIT = make_mat(
    "cold_white_glow",
    (0.85, 0.9, 1.0, 1),
    emission=(0.75, 0.82, 1.0, 1),
    emission_strength=1.4,
)
MAT_CABINET = make_mat("old_cabinet", (0.26, 0.23, 0.21, 1), roughness=0.96)
MAT_DIRT = make_mat("dirt_stain", (0.08, 0.045, 0.035, 1), roughness=1.0)


def cube(name, loc, scale, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if mat:
        obj.data.materials.append(mat)

    return obj


def cyl(name, loc, radius, depth, mat, vertices=10, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name

    if mat:
        obj.data.materials.append(mat)

    return obj


def sphere(name, loc, radius, mat, segments=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=max(6, segments // 2),
        radius=radius,
        location=loc,
    )
    obj = bpy.context.object
    obj.name = name

    if mat:
        obj.data.materials.append(mat)

    return obj


def add_lowpoly_modifier(obj):
    decimate = obj.modifiers.new("lofi_decimate", "DECIMATE")
    decimate.ratio = 0.72


def shade_flat_all():
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.shade_flat()
            obj.select_set(False)


def export_glb(filename):
    shade_flat_all()

    path = os.path.join(OUT_DIR, filename)

    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )

    print(f"exported: {path}")


def make_stalker():
    clear_scene()

    # Body: deliberately thin, human-like, slightly wrong proportions.
    cube("coat_body", (0, 1.15, 0), (0.62, 1.55, 0.34), MAT_COAT)
    cube("coat_tail_l", (-0.18, 0.34, 0.02), (0.24, 0.78, 0.3), MAT_COAT, rotation=(0, 0, 0.08))
    cube("coat_tail_r", (0.18, 0.34, 0.02), (0.24, 0.78, 0.3), MAT_COAT, rotation=(0, 0, -0.08))

    cube("neck", (0, 2.0, 0), (0.18, 0.26, 0.18), MAT_BLACK)
    cube("head", (0.04, 2.28, -0.02), (0.46, 0.42, 0.38), MAT_BLACK, rotation=(0.08, 0.0, -0.12))

    # Shoulders and arms
    cube("shoulder", (0, 1.82, 0), (0.96, 0.18, 0.34), MAT_COAT)
    cube("left_arm", (-0.62, 1.18, 0.02), (0.18, 1.28, 0.2), MAT_COAT, rotation=(0, 0, -0.16))
    cube("right_arm", (0.62, 1.18, 0.02), (0.18, 1.28, 0.2), MAT_COAT, rotation=(0, 0, 0.16))

    cube("left_leg", (-0.18, 0.0, 0), (0.2, 0.95, 0.22), MAT_BLACK)
    cube("right_leg", (0.2, 0.0, 0), (0.2, 0.95, 0.22), MAT_BLACK)

    cube("left_foot", (-0.2, -0.5, -0.08), (0.36, 0.12, 0.48), MAT_BLACK)
    cube("right_foot", (0.22, -0.5, -0.08), (0.36, 0.12, 0.48), MAT_BLACK)

    # Knife / blade
    cube("knife_handle", (0.72, 0.72, -0.02), (0.12, 0.35, 0.12), MAT_DARK, rotation=(0, 0, -0.18))
    cube("knife_blade", (0.84, 0.28, -0.02), (0.06, 0.82, 0.08), MAT_METAL, rotation=(0, 0, -0.18))

    # Tiny eye slits. Not realistic, just visible.
    cube("eye_l", (-0.08, 2.31, -0.215), (0.09, 0.035, 0.025), MAT_RED_EMIT)
    cube("eye_r", (0.12, 2.31, -0.215), (0.09, 0.035, 0.025), MAT_RED_EMIT)

    export_glb("stalker.glb")


def make_rusty_door():
    clear_scene()

    cube("door_panel", (0, 1.1, 0), (1.45, 2.2, 0.16), MAT_RUST)
    cube("door_inner_panel", (0, 1.12, -0.085), (1.05, 1.55, 0.045), MAT_RUST_DARK)

    cube("frame_left", (-0.83, 1.16, 0.02), (0.16, 2.42, 0.24), MAT_DARK)
    cube("frame_right", (0.83, 1.16, 0.02), (0.16, 2.42, 0.24), MAT_DARK)
    cube("frame_top", (0, 2.42, 0.02), (1.82, 0.16, 0.24), MAT_DARK)

    cube("handle", (0.52, 1.1, -0.16), (0.16, 0.12, 0.2), MAT_METAL)
    cube("lock_plate", (0.52, 0.86, -0.12), (0.18, 0.28, 0.06), MAT_METAL)

    cube("small_window", (0, 1.78, -0.1), (0.58, 0.28, 0.04), MAT_BLACK)
    cube("red_panel", (0, 2.72, -0.04), (0.84, 0.2, 0.06), MAT_RED_EMIT)

    # Rust strips
    for i, x in enumerate([-0.45, -0.1, 0.32]):
        cube(f"rust_strip_{i}", (x, 1.0 + i * 0.22, -0.105), (0.08, 1.4, 0.035), MAT_RUST_DARK)

    export_glb("rusty_door.glb")


def make_breaker_box():
    clear_scene()

    cube("box_back", (0, 1.1, 0), (0.72, 1.15, 0.18), MAT_DARK)
    cube("box_door", (0, 1.1, -0.11), (0.62, 1.0, 0.08), MAT_METAL)
    cube("slot_empty", (0, 1.22, -0.17), (0.22, 0.42, 0.05), MAT_BLACK)

    cube("lever_base", (0.18, 0.78, -0.18), (0.2, 0.16, 0.06), MAT_DARK)
    cube("lever", (0.24, 0.91, -0.22), (0.08, 0.44, 0.08), MAT_RUST, rotation=(0, 0, -0.35))

    cube("indicator_red", (-0.22, 1.52, -0.18), (0.12, 0.12, 0.04), MAT_RED_EMIT)
    cube("indicator_dead", (0.0, 1.52, -0.18), (0.12, 0.12, 0.04), MAT_BLACK)
    cube("indicator_yellow", (0.22, 1.52, -0.18), (0.12, 0.12, 0.04), MAT_YELLOW)

    export_glb("breaker_box.glb")


def make_fuse():
    clear_scene()

    cyl("fuse_core", (0, 0.15, 0), 0.12, 0.58, MAT_YELLOW, vertices=8, rotation=(math.pi / 2, 0, 0))
    cyl("cap_l", (0, 0.15, -0.34), 0.125, 0.12, MAT_METAL, vertices=8, rotation=(math.pi / 2, 0, 0))
    cyl("cap_r", (0, 0.15, 0.34), 0.125, 0.12, MAT_METAL, vertices=8, rotation=(math.pi / 2, 0, 0))

    sphere("glow_hint", (0, 0.15, 0), 0.22, MAT_YELLOW, segments=10)

    export_glb("fuse.glb")


def make_ceiling_light():
    clear_scene()

    cube("fixture", (0, 0, 0), (1.35, 0.09, 0.32), MAT_DARK)
    cube("tube", (0, -0.08, 0), (1.12, 0.08, 0.12), MAT_WHITE_EMIT)
    cube("cap_l", (-0.66, -0.08, 0), (0.12, 0.12, 0.16), MAT_METAL)
    cube("cap_r", (0.66, -0.08, 0), (0.12, 0.12, 0.16), MAT_METAL)

    export_glb("ceiling_light.glb")


def make_cabinet():
    clear_scene()

    cube("cabinet_body", (0, 0.85, 0), (1.1, 1.7, 0.55), MAT_CABINET)
    cube("cabinet_top", (0, 1.74, 0), (1.18, 0.08, 0.62), MAT_DARK)
    cube("door_l", (-0.28, 0.9, -0.31), (0.5, 1.38, 0.06), MAT_CABINET)
    cube("door_r", (0.28, 0.9, -0.31), (0.5, 1.38, 0.06), MAT_CABINET)

    cube("handle_l", (-0.08, 0.9, -0.36), (0.045, 0.5, 0.045), MAT_METAL)
    cube("handle_r", (0.08, 0.9, -0.36), (0.045, 0.5, 0.045), MAT_METAL)

    cube("dirt_1", (-0.32, 1.26, -0.36), (0.22, 0.42, 0.03), MAT_DIRT)
    cube("dirt_2", (0.28, 0.54, -0.36), (0.18, 0.34, 0.03), MAT_DIRT)

    export_glb("cabinet.glb")


def main():
    make_stalker()
    make_rusty_door()
    make_breaker_box()
    make_fuse()
    make_ceiling_light()
    make_cabinet()


if __name__ == "__main__":
    main()