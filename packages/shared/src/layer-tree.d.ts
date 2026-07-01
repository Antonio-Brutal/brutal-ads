import { z } from 'zod';
export declare const RenderHints: z.ZodObject<{
    safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
    maxLines: z.ZodDefault<z.ZodNumber>;
    autoFit: z.ZodDefault<z.ZodBoolean>;
    minFontPx: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
    maxLines: number;
    autoFit: boolean;
    minFontPx: number;
}, {
    safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
    maxLines?: number | undefined;
    autoFit?: boolean | undefined;
    minFontPx?: number | undefined;
}>;
export declare const Layer: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["image", "text", "logo", "shape", "cta", "frame", "legal", "group", "smart"]>;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    rotation: z.ZodDefault<z.ZodNumber>;
    z: z.ZodNumber;
    text: z.ZodOptional<z.ZodString>;
    assetId: z.ZodOptional<z.ZodString>;
    fill: z.ZodOptional<z.ZodString>;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontWeight: z.ZodOptional<z.ZodNumber>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    binding: z.ZodOptional<z.ZodString>;
    renderHints: z.ZodDefault<z.ZodObject<{
        safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
        maxLines: z.ZodDefault<z.ZodNumber>;
        autoFit: z.ZodDefault<z.ZodBoolean>;
        minFontPx: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
        maxLines: number;
        autoFit: boolean;
        minFontPx: number;
    }, {
        safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
        maxLines?: number | undefined;
        autoFit?: boolean | undefined;
        minFontPx?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    z: number;
    renderHints: {
        safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
        maxLines: number;
        autoFit: boolean;
        minFontPx: number;
    };
    fill?: string | undefined;
    text?: string | undefined;
    assetId?: string | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: number | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    binding?: string | undefined;
}, {
    type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
    fill?: string | undefined;
    text?: string | undefined;
    rotation?: number | undefined;
    assetId?: string | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: number | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    binding?: string | undefined;
    renderHints?: {
        safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
        maxLines?: number | undefined;
        autoFit?: boolean | undefined;
        minFontPx?: number | undefined;
    } | undefined;
}>;
export type Layer = z.infer<typeof Layer>;
export declare const LayerTree: z.ZodObject<{
    format: z.ZodString;
    canvas: z.ZodObject<{
        w: z.ZodNumber;
        h: z.ZodNumber;
        bg: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        w: number;
        h: number;
        bg?: string | undefined;
    }, {
        w: number;
        h: number;
        bg?: string | undefined;
    }>;
    layers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["image", "text", "logo", "shape", "cta", "frame", "legal", "group", "smart"]>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        rotation: z.ZodDefault<z.ZodNumber>;
        z: z.ZodNumber;
        text: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodString>;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontWeight: z.ZodOptional<z.ZodNumber>;
        fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
        binding: z.ZodOptional<z.ZodString>;
        renderHints: z.ZodDefault<z.ZodObject<{
            safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
            maxLines: z.ZodDefault<z.ZodNumber>;
            autoFit: z.ZodDefault<z.ZodBoolean>;
            minFontPx: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        }, {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        z: number;
        renderHints: {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        };
        fill?: string | undefined;
        text?: string | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
    }, {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        z: number;
        fill?: string | undefined;
        text?: string | undefined;
        rotation?: number | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
        renderHints?: {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    format: string;
    canvas: {
        w: number;
        h: number;
        bg?: string | undefined;
    };
    layers: {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        z: number;
        renderHints: {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        };
        fill?: string | undefined;
        text?: string | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
    }[];
}, {
    format: string;
    canvas: {
        w: number;
        h: number;
        bg?: string | undefined;
    };
    layers: {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        z: number;
        fill?: string | undefined;
        text?: string | undefined;
        rotation?: number | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
        renderHints?: {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        } | undefined;
    }[];
}>;
export type LayerTree = z.infer<typeof LayerTree>;
export declare const LayerPatchOp: z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
    op: z.ZodLiteral<"setText">;
    layerId: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    op: "setText";
    layerId: string;
}, {
    text: string;
    op: "setText";
    layerId: string;
}>, z.ZodObject<{
    op: z.ZodLiteral<"resize">;
    layerId: z.ZodString;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    op: "resize";
    layerId: string;
    x?: number | undefined;
    y?: number | undefined;
}, {
    width: number;
    height: number;
    op: "resize";
    layerId: string;
    x?: number | undefined;
    y?: number | undefined;
}>, z.ZodObject<{
    op: z.ZodLiteral<"rotate">;
    layerId: z.ZodString;
    rotation: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    rotation: number;
    op: "rotate";
    layerId: string;
}, {
    rotation: number;
    op: "rotate";
    layerId: string;
}>, z.ZodObject<{
    op: z.ZodLiteral<"reorderZ">;
    layerId: z.ZodString;
    toIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    op: "reorderZ";
    layerId: string;
    toIndex: number;
}, {
    op: "reorderZ";
    layerId: string;
    toIndex: number;
}>, z.ZodObject<{
    op: z.ZodLiteral<"setFont">;
    layerId: z.ZodString;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontWeight: z.ZodOptional<z.ZodNumber>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
}, "strip", z.ZodTypeAny, {
    op: "setFont";
    layerId: string;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: number | undefined;
    fontStyle?: "normal" | "italic" | undefined;
}, {
    op: "setFont";
    layerId: string;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: number | undefined;
    fontStyle?: "normal" | "italic" | undefined;
}>, z.ZodObject<{
    op: z.ZodLiteral<"setFill">;
    layerId: z.ZodString;
    fill: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fill: string;
    op: "setFill";
    layerId: string;
}, {
    fill: string;
    op: "setFill";
    layerId: string;
}>, z.ZodObject<{
    op: z.ZodLiteral<"addLayer">;
    afterLayerId: z.ZodNullable<z.ZodString>;
    layer: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["image", "text", "logo", "shape", "cta", "frame", "legal", "group", "smart"]>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
        rotation: z.ZodDefault<z.ZodNumber>;
        z: z.ZodNumber;
        text: z.ZodOptional<z.ZodString>;
        assetId: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodString>;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontWeight: z.ZodOptional<z.ZodNumber>;
        fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
        binding: z.ZodOptional<z.ZodString>;
        renderHints: z.ZodDefault<z.ZodObject<{
            safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
            maxLines: z.ZodDefault<z.ZodNumber>;
            autoFit: z.ZodDefault<z.ZodBoolean>;
            minFontPx: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        }, {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        z: number;
        renderHints: {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        };
        fill?: string | undefined;
        text?: string | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
    }, {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        z: number;
        fill?: string | undefined;
        text?: string | undefined;
        rotation?: number | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
        renderHints?: {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    op: "addLayer";
    afterLayerId: string | null;
    layer: {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        z: number;
        renderHints: {
            safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
            maxLines: number;
            autoFit: boolean;
            minFontPx: number;
        };
        fill?: string | undefined;
        text?: string | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
    };
}, {
    op: "addLayer";
    afterLayerId: string | null;
    layer: {
        type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        z: number;
        fill?: string | undefined;
        text?: string | undefined;
        rotation?: number | undefined;
        assetId?: string | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
        binding?: string | undefined;
        renderHints?: {
            safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
            maxLines?: number | undefined;
            autoFit?: boolean | undefined;
            minFontPx?: number | undefined;
        } | undefined;
    };
}>, z.ZodObject<{
    op: z.ZodLiteral<"removeLayer">;
    layerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    op: "removeLayer";
    layerId: string;
}, {
    op: "removeLayer";
    layerId: string;
}>, z.ZodObject<{
    op: z.ZodLiteral<"replaceAsset">;
    layerId: z.ZodString;
    assetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    op: "replaceAsset";
    layerId: string;
}, {
    assetId: string;
    op: "replaceAsset";
    layerId: string;
}>, z.ZodObject<{
    op: z.ZodLiteral<"setBinding">;
    layerId: z.ZodString;
    binding: z.ZodString;
    template: z.ZodOptional<z.ZodString>;
    fallback: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    binding: string;
    op: "setBinding";
    layerId: string;
    template?: string | undefined;
    fallback?: string | undefined;
}, {
    binding: string;
    op: "setBinding";
    layerId: string;
    template?: string | undefined;
    fallback?: string | undefined;
}>, z.ZodObject<{
    op: z.ZodLiteral<"setSlideOrder">;
    order: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    op: "setSlideOrder";
    order: string[];
}, {
    op: "setSlideOrder";
    order: string[];
}>, z.ZodObject<{
    op: z.ZodLiteral<"setVisible">;
    layerId: z.ZodString;
    visible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    op: "setVisible";
    layerId: string;
    visible: boolean;
}, {
    op: "setVisible";
    layerId: string;
    visible: boolean;
}>]>;
export type LayerPatchOp = z.infer<typeof LayerPatchOp>;
export declare const LayerPatch: z.ZodObject<{
    id: z.ZodString;
    variantId: z.ZodString;
    slideId: z.ZodOptional<z.ZodString>;
    origin: z.ZodEnum<["chat", "canvas", "agent", "system"]>;
    createdBy: z.ZodEnum<["human", "agent", "system"]>;
    note: z.ZodOptional<z.ZodString>;
    ops: z.ZodArray<z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
        op: z.ZodLiteral<"setText">;
        layerId: z.ZodString;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        text: string;
        op: "setText";
        layerId: string;
    }, {
        text: string;
        op: "setText";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"resize">;
        layerId: z.ZodString;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"rotate">;
        layerId: z.ZodString;
        rotation: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rotation: number;
        op: "rotate";
        layerId: string;
    }, {
        rotation: number;
        op: "rotate";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"reorderZ">;
        layerId: z.ZodString;
        toIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    }, {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setFont">;
        layerId: z.ZodString;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontWeight: z.ZodOptional<z.ZodNumber>;
        fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    }, "strip", z.ZodTypeAny, {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }, {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setFill">;
        layerId: z.ZodString;
        fill: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        fill: string;
        op: "setFill";
        layerId: string;
    }, {
        fill: string;
        op: "setFill";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"addLayer">;
        afterLayerId: z.ZodNullable<z.ZodString>;
        layer: z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["image", "text", "logo", "shape", "cta", "frame", "legal", "group", "smart"]>;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            rotation: z.ZodDefault<z.ZodNumber>;
            z: z.ZodNumber;
            text: z.ZodOptional<z.ZodString>;
            assetId: z.ZodOptional<z.ZodString>;
            fill: z.ZodOptional<z.ZodString>;
            fontFamily: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontWeight: z.ZodOptional<z.ZodNumber>;
            fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
            binding: z.ZodOptional<z.ZodString>;
            renderHints: z.ZodDefault<z.ZodObject<{
                safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
                maxLines: z.ZodDefault<z.ZodNumber>;
                autoFit: z.ZodDefault<z.ZodBoolean>;
                minFontPx: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            }, {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        }, {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        };
    }, {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        op: z.ZodLiteral<"removeLayer">;
        layerId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        op: "removeLayer";
        layerId: string;
    }, {
        op: "removeLayer";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"replaceAsset">;
        layerId: z.ZodString;
        assetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    }, {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setBinding">;
        layerId: z.ZodString;
        binding: z.ZodString;
        template: z.ZodOptional<z.ZodString>;
        fallback: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    }, {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setSlideOrder">;
        order: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        op: "setSlideOrder";
        order: string[];
    }, {
        op: "setSlideOrder";
        order: string[];
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setVisible">;
        layerId: z.ZodString;
        visible: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    }, {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    variantId: string;
    origin: "canvas" | "chat" | "agent" | "system";
    createdBy: "agent" | "system" | "human";
    ops: ({
        text: string;
        op: "setText";
        layerId: string;
    } | {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    } | {
        rotation: number;
        op: "rotate";
        layerId: string;
    } | {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    } | {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    } | {
        fill: string;
        op: "setFill";
        layerId: string;
    } | {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        };
    } | {
        op: "removeLayer";
        layerId: string;
    } | {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    } | {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    } | {
        op: "setSlideOrder";
        order: string[];
    } | {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    })[];
    slideId?: string | undefined;
    note?: string | undefined;
}, {
    id: string;
    variantId: string;
    origin: "canvas" | "chat" | "agent" | "system";
    createdBy: "agent" | "system" | "human";
    ops: ({
        text: string;
        op: "setText";
        layerId: string;
    } | {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    } | {
        rotation: number;
        op: "rotate";
        layerId: string;
    } | {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    } | {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    } | {
        fill: string;
        op: "setFill";
        layerId: string;
    } | {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        };
    } | {
        op: "removeLayer";
        layerId: string;
    } | {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    } | {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    } | {
        op: "setSlideOrder";
        order: string[];
    } | {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    })[];
    slideId?: string | undefined;
    note?: string | undefined;
}>;
export type LayerPatch = z.infer<typeof LayerPatch>;
export declare const LayerPatchSet: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    variantId: z.ZodString;
    slideId: z.ZodOptional<z.ZodString>;
    origin: z.ZodEnum<["chat", "canvas", "agent", "system"]>;
    createdBy: z.ZodEnum<["human", "agent", "system"]>;
    note: z.ZodOptional<z.ZodString>;
    ops: z.ZodArray<z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
        op: z.ZodLiteral<"setText">;
        layerId: z.ZodString;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        text: string;
        op: "setText";
        layerId: string;
    }, {
        text: string;
        op: "setText";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"resize">;
        layerId: z.ZodString;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"rotate">;
        layerId: z.ZodString;
        rotation: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rotation: number;
        op: "rotate";
        layerId: string;
    }, {
        rotation: number;
        op: "rotate";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"reorderZ">;
        layerId: z.ZodString;
        toIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    }, {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setFont">;
        layerId: z.ZodString;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontWeight: z.ZodOptional<z.ZodNumber>;
        fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    }, "strip", z.ZodTypeAny, {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }, {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setFill">;
        layerId: z.ZodString;
        fill: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        fill: string;
        op: "setFill";
        layerId: string;
    }, {
        fill: string;
        op: "setFill";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"addLayer">;
        afterLayerId: z.ZodNullable<z.ZodString>;
        layer: z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["image", "text", "logo", "shape", "cta", "frame", "legal", "group", "smart"]>;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
            rotation: z.ZodDefault<z.ZodNumber>;
            z: z.ZodNumber;
            text: z.ZodOptional<z.ZodString>;
            assetId: z.ZodOptional<z.ZodString>;
            fill: z.ZodOptional<z.ZodString>;
            fontFamily: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontWeight: z.ZodOptional<z.ZodNumber>;
            fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
            binding: z.ZodOptional<z.ZodString>;
            renderHints: z.ZodDefault<z.ZodObject<{
                safeZone: z.ZodDefault<z.ZodEnum<["feed", "profile_overlap", "see_more_fold", "none"]>>;
                maxLines: z.ZodDefault<z.ZodNumber>;
                autoFit: z.ZodDefault<z.ZodBoolean>;
                minFontPx: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            }, {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        }, {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        };
    }, {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        op: z.ZodLiteral<"removeLayer">;
        layerId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        op: "removeLayer";
        layerId: string;
    }, {
        op: "removeLayer";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"replaceAsset">;
        layerId: z.ZodString;
        assetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    }, {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setBinding">;
        layerId: z.ZodString;
        binding: z.ZodString;
        template: z.ZodOptional<z.ZodString>;
        fallback: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    }, {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setSlideOrder">;
        order: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        op: "setSlideOrder";
        order: string[];
    }, {
        op: "setSlideOrder";
        order: string[];
    }>, z.ZodObject<{
        op: z.ZodLiteral<"setVisible">;
        layerId: z.ZodString;
        visible: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    }, {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    variantId: string;
    origin: "canvas" | "chat" | "agent" | "system";
    createdBy: "agent" | "system" | "human";
    ops: ({
        text: string;
        op: "setText";
        layerId: string;
    } | {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    } | {
        rotation: number;
        op: "rotate";
        layerId: string;
    } | {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    } | {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    } | {
        fill: string;
        op: "setFill";
        layerId: string;
    } | {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            z: number;
            renderHints: {
                safeZone: "feed" | "profile_overlap" | "see_more_fold" | "none";
                maxLines: number;
                autoFit: boolean;
                minFontPx: number;
            };
            fill?: string | undefined;
            text?: string | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
        };
    } | {
        op: "removeLayer";
        layerId: string;
    } | {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    } | {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    } | {
        op: "setSlideOrder";
        order: string[];
    } | {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    })[];
    slideId?: string | undefined;
    note?: string | undefined;
}, {
    id: string;
    variantId: string;
    origin: "canvas" | "chat" | "agent" | "system";
    createdBy: "agent" | "system" | "human";
    ops: ({
        text: string;
        op: "setText";
        layerId: string;
    } | {
        width: number;
        height: number;
        op: "resize";
        layerId: string;
        x?: number | undefined;
        y?: number | undefined;
    } | {
        rotation: number;
        op: "rotate";
        layerId: string;
    } | {
        op: "reorderZ";
        layerId: string;
        toIndex: number;
    } | {
        op: "setFont";
        layerId: string;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        fontWeight?: number | undefined;
        fontStyle?: "normal" | "italic" | undefined;
    } | {
        fill: string;
        op: "setFill";
        layerId: string;
    } | {
        op: "addLayer";
        afterLayerId: string | null;
        layer: {
            type: "image" | "text" | "logo" | "shape" | "cta" | "frame" | "legal" | "group" | "smart";
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            z: number;
            fill?: string | undefined;
            text?: string | undefined;
            rotation?: number | undefined;
            assetId?: string | undefined;
            fontFamily?: string | undefined;
            fontSize?: number | undefined;
            fontWeight?: number | undefined;
            fontStyle?: "normal" | "italic" | undefined;
            binding?: string | undefined;
            renderHints?: {
                safeZone?: "feed" | "profile_overlap" | "see_more_fold" | "none" | undefined;
                maxLines?: number | undefined;
                autoFit?: boolean | undefined;
                minFontPx?: number | undefined;
            } | undefined;
        };
    } | {
        op: "removeLayer";
        layerId: string;
    } | {
        assetId: string;
        op: "replaceAsset";
        layerId: string;
    } | {
        binding: string;
        op: "setBinding";
        layerId: string;
        template?: string | undefined;
        fallback?: string | undefined;
    } | {
        op: "setSlideOrder";
        order: string[];
    } | {
        op: "setVisible";
        layerId: string;
        visible: boolean;
    })[];
    slideId?: string | undefined;
    note?: string | undefined;
}>, "many">;
export type LayerPatchSet = z.infer<typeof LayerPatchSet>;
/**
 * Pure, isomorphic patch application — same fn in the browser (optimistic),
 * server (authoritative), and renderer. TODO(factory): implement per docs/06 §4.
 */
export declare function applyLayerPatch(_tree: LayerTree, _patch: LayerPatch): LayerTree;
