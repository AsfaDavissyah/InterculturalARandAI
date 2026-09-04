import json
import os
import sys

import bpy
from io_scene_fbx import import_fbx


_original_read_light = import_fbx.blen_read_light


def read_light_without_legacy_cycles_shadow(*args, **kwargs):
    try:
        return _original_read_light(*args, **kwargs)
    except AttributeError as error:
        if "cast_shadow" not in str(error) or not bpy.data.lights:
            raise
        return bpy.data.lights[-1]


import_fbx.blen_read_light = read_light_without_legacy_cycles_shadow


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def inspect_model(path):
    reset_scene()
    if path.lower().endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        bpy.ops.import_scene.fbx(filepath=path, use_anim=True)

    meshes = []
    armatures = []
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            meshes.append(
                {
                    "name": obj.name,
                    "vertices": len(obj.data.vertices),
                    "polygons": len(obj.data.polygons),
                    "materials": [slot.material.name for slot in obj.material_slots if slot.material],
                    "parent": obj.parent.name if obj.parent else None,
                    "armature_modifiers": [
                        modifier.object.name
                        for modifier in obj.modifiers
                        if modifier.type == "ARMATURE" and modifier.object
                    ],
                }
            )
        elif obj.type == "ARMATURE":
            armatures.append(
                {
                    "name": obj.name,
                    "bones": len(obj.data.bones),
                    "bone_names": [bone.name for bone in obj.data.bones],
                }
            )

    actions = []
    for action in bpy.data.actions:
        actions.append(
            {
                "name": action.name,
                "frame_range": list(action.frame_range),
                "fcurves": len(getattr(action, "fcurves", [])),
            }
        )

    return {
        "file": os.path.basename(path),
        "objects": len(bpy.context.scene.objects),
        "meshes": meshes,
        "armatures": armatures,
        "actions": actions,
    }


paths = [
    arg
    for arg in sys.argv[sys.argv.index("--") + 1 :]
    if arg.lower().endswith((".fbx", ".glb", ".gltf"))
]
print("AVATAR_INSPECTION=" + json.dumps([inspect_model(path) for path in paths]))
